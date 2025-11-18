import { Injectable, Logger } from '@nestjs/common';

import { BedrockService } from '@/common/bedrock.service';
import { buildTextToSQLPrompt } from '@/prompts/text-to-sql.prompt';

import { QueryRepository } from './query.repository';

export interface QueryResult {
  sql: string;
  data: unknown[];
  executionTime: number;
}

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);

  constructor(
    private readonly bedrockService: BedrockService,
    private readonly queryRepository: QueryRepository,
  ) {}

  /**
   * 자연어 질의를 SQL로 변환
   * @param userQuery 사용자 질의
   * @returns 생성된 SQL 쿼리
   */
  async generateSQL(userQuery: string): Promise<string> {
    this.logger.log(`Generating SQL for query: ${userQuery}`);

    const schema = await this.queryRepository.getSchema();
    const { system, user } = buildTextToSQLPrompt({
      schema,
      query: userQuery,
    });

    const response = await this.bedrockService.invokeModel(
      [
        {
          role: 'user',
          content: user,
        },
      ],
      {
        system,
        max_tokens: 2048,
        temperature: 0.3, // 낮은 temperature로 일관성 있는 SQL 생성
      },
    );

    if (response.content && response.content.length > 0) {
      const sql = response.content[0].text.trim();
      this.logger.log(`Generated SQL: ${sql}`);
      return sql;
    }

    throw new Error('No SQL query generated from Bedrock response');
  }

  /**
   * SQL 쿼리 검증
   * @param sql SQL 쿼리
   * @returns 검증 결과
   */
  validateSQL(sql: string): {
    isValid: boolean;
    error?: string;
  } {
    // 기본적인 SQL Injection 방어
    const dangerousPatterns = [
      /;\s*DROP/i,
      /;\s*DELETE\s+FROM/i,
      /;\s*UPDATE.*SET/i,
      /;\s*INSERT\s+INTO/i,
      /;\s*TRUNCATE/i,
      /;\s*ALTER/i,
      /;\s*CREATE/i,
      /UNION.*SELECT/i,
      /--/,
      /\/\*/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        return {
          isValid: false,
          error: `Potentially dangerous SQL pattern detected: ${pattern.source}`,
        };
      }
    }

    // SELECT 쿼리만 허용
    if (!sql.trim().toUpperCase().startsWith('SELECT')) {
      return {
        isValid: false,
        error: 'Only SELECT queries are allowed',
      };
    }

    return { isValid: true };
  }

  /**
   * SQL 실행
   * @param sql SQL 쿼리
   * @returns 쿼리 결과
   */
  async executeSQL(sql: string): Promise<QueryResult> {
    const validation = this.validateSQL(sql);
    if (!validation.isValid) {
      throw new Error(`SQL validation failed: ${validation.error}`);
    }

    this.logger.log(`Executing validated SQL: ${sql}`);

    const startTime = Date.now();
    const data = await this.queryRepository.execute(sql);
    const executionTime = Date.now() - startTime;

    this.logger.log(`Query executed in ${executionTime}ms, returned ${data.length} rows`);

    return {
      sql,
      data,
      executionTime,
    };
  }

  /**
   * 자연어 질의 → SQL 생성 → 실행 (전체 파이프라인)
   * @param userQuery 사용자 질의
   * @returns 쿼리 결과
   */
  async queryFromNaturalLanguage(userQuery: string): Promise<QueryResult> {
    const sql = await this.generateSQL(userQuery);
    return await this.executeSQL(sql);
  }
}
