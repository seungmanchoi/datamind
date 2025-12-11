import { Injectable, Logger } from '@nestjs/common';

import { getRelevantExamples } from '@/agents/config/fewshot-examples';
import { BedrockService } from '@/common/bedrock.service';
import { ClarificationSection, QueryAnalysisResult } from '@/dto/common';
import { QueryRepository } from '@/modules/query/query.repository';
import { buildTextToSQLPrompt } from '@/prompts/text-to-sql.prompt';
import { RagService, SqlExample } from '@/rag/rag.service';

/**
 * Phase 7 Enhanced Query Result
 * LLM이 자동으로 시각화를 결정하고 풍부한 인사이트를 제공합니다
 */
export interface EnhancedQueryResult {
  // 기본 정보
  query: string;
  sql: string;
  results: unknown[];
  executionTime: number;

  // Phase 7: AI 인사이트
  insights: {
    summary: string;
    keyFindings: string[];
    comparison?: string;
    trend?: string;
    anomaly?: string;
    recommendation?: string;
  };

  // Phase 7: 시각화 추천
  visualization: {
    type: 'chart' | 'table' | 'both';
    chartType?: 'bar' | 'line' | 'pie';
    reason: string;
  };

  // Phase 7: 추가 질문 (선택적) - 공통 타입 사용
  clarifyingQuestions?: ClarificationSection;
}

/**
 * 기본 Query Result (Phase 6 호환)
 */
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
    private readonly ragService: RagService,
  ) {}

  /**
   * Phase 7: 질의 분석
   * 사용자 질의가 불충분한지 판단하고 필요시 추가 질문을 생성합니다
   * @param userQuery 사용자 질문
   * @returns 추가 질문이 필요하면 질문 목록, 아니면 null
   */
  async analyzeQuery(userQuery: string): Promise<QueryAnalysisResult | null> {
    this.logger.log('Step 1: Analyzing user query');

    try {
      const analysis = await this.bedrockService.analyzeQuery(userQuery);

      if (analysis.needsClarification) {
        this.logger.log('Query needs clarification');
        return analysis;
      }

      this.logger.log('Query is sufficient, proceeding to SQL generation');
      return null;
    } catch (error) {
      this.logger.error('Query analysis failed, proceeding without clarification', error);
      // 분석 실패 시에도 진행
      return null;
    }
  }

  /**
   * RAG 검색 결과를 상세 로깅
   */
  private logRagResults(query: string, examples: SqlExample[], source: 'RAG' | 'Fallback'): void {
    this.logger.log('═'.repeat(60));
    this.logger.log(`📊 Few-Shot Hint 검색 결과 (Source: ${source})`);
    this.logger.log('─'.repeat(60));
    this.logger.log(`🔍 User Query: "${query}"`);
    this.logger.log(`📝 검색된 예제 수: ${examples.length}개`);
    this.logger.log('─'.repeat(60));

    examples.forEach((ex, idx) => {
      this.logger.log(`\n[Example ${idx + 1}] Score: ${ex.score?.toFixed(4) || 'N/A'}`);
      this.logger.log(`  📌 Description: ${ex.description}`);
      this.logger.log(`  💾 SQL: ${ex.sql.substring(0, 100)}${ex.sql.length > 100 ? '...' : ''}`);
    });

    this.logger.log('═'.repeat(60));
  }

  /**
   * 자연어 질의를 SQL로 변환
   * RAG 기반 OpenSearch 벡터 검색으로 유사 SQL 예제를 few-shot hint로 사용
   * @param userQuery 사용자 질의
   * @returns 생성된 SQL 쿼리
   */
  async generateSQL(userQuery: string): Promise<string> {
    this.logger.log(`Step 2: Generating SQL for query: ${userQuery}`);

    const schema = await this.queryRepository.getSchema();

    // RAG 기반 Few-shot 예제 검색 (OpenSearch 벡터 검색)
    let fewShotExamples: string;

    try {
      this.logger.log(`🚀 RAG 검색 시작: "${userQuery.substring(0, 50)}..."`);
      const ragContext = await this.ragService.getRagContext(userQuery, 5);

      if (ragContext.examples.length > 0) {
        // RAG 검색 결과 로깅
        this.logRagResults(userQuery, ragContext.examples, 'RAG');

        fewShotExamples = ragContext.examples
          .map(
            (example, index) => `
Example ${index + 1}:
Description: "${example.description}"
SQL: ${example.sql}
Similarity Score: ${example.score?.toFixed(4) || 'N/A'}`,
          )
          .join('\n');

        this.logger.log(`✅ RAG: ${ragContext.examples.length}개 유사 예제 검색 완료`);
      } else {
        // RAG 결과가 없으면 키워드 매칭 폴백
        this.logger.warn('⚠️ RAG 검색 결과 없음 - Fallback 사용');
        const relevantExamples = getRelevantExamples(userQuery, 5);
        fewShotExamples = relevantExamples
          .map(
            (example, index) => `
Example ${index + 1}:
Question: "${example.question}"
SQL: ${example.sql}
${example.description ? `Note: ${example.description}` : ''}`,
          )
          .join('\n');

        this.logger.log(`📋 Fallback: ${relevantExamples.length}개 키워드 매칭 예제 사용`);
      }
    } catch (error) {
      // RAG 실패 시 키워드 매칭 폴백
      this.logger.error(`❌ RAG Service 오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.logger.warn('⚠️ Fallback: 키워드 매칭 방식 사용');

      const relevantExamples = getRelevantExamples(userQuery, 5);
      fewShotExamples = relevantExamples
        .map(
          (example, index) => `
Example ${index + 1}:
Question: "${example.question}"
SQL: ${example.sql}
${example.description ? `Note: ${example.description}` : ''}`,
        )
        .join('\n');

      this.logger.log(`📋 Fallback: ${relevantExamples.length}개 키워드 매칭 예제 사용`);
    }

    const { system, user } = buildTextToSQLPrompt({
      schema,
      query: userQuery,
      fewShotExamples,
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
    this.logger.log('Step 3: Validating SQL');

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

    // SELECT 또는 WITH...SELECT 쿼리만 허용
    const upperSql = sql.trim().toUpperCase();
    const isSelectQuery = upperSql.startsWith('SELECT');
    const isWithSelectQuery = upperSql.startsWith('WITH') && upperSql.includes('SELECT');

    if (!isSelectQuery && !isWithSelectQuery) {
      return {
        isValid: false,
        error: 'Only SELECT queries are allowed (WITH...SELECT CTE is also allowed)',
      };
    }

    this.logger.log('SQL validation passed');
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

    this.logger.log(`Step 4: Executing validated SQL: ${sql}`);

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
   * Phase 7: Enhanced 파이프라인
   * 자연어 질의 → 질의 분석 → SQL 생성 → 실행 → 인사이트 생성 → 시각화 선택
   * @param userQuery 사용자 질의
   * @returns Enhanced 쿼리 결과 (인사이트 + 시각화 포함)
   */
  async queryFromNaturalLanguage(userQuery: string): Promise<EnhancedQueryResult> {
    this.logger.log(`=== Phase 7 Enhanced Query Pipeline Start ===`);
    this.logger.log(`User Query: ${userQuery}`);

    // Step 1: 질의 분석 (추가 질문 필요 여부 판단)
    const clarificationResult = await this.analyzeQuery(userQuery);

    // 추가 질문이 필요한 경우 여기서 반환
    if (clarificationResult && clarificationResult.needsClarification) {
      this.logger.log('Returning clarifying questions to user');
      return {
        query: userQuery,
        sql: '',
        results: [],
        executionTime: 0,
        insights: {
          summary: '질문을 더 구체화해주시면 정확한 답변을 드릴 수 있습니다.',
          keyFindings: [],
        },
        visualization: {
          type: 'table',
          reason: '추가 정보가 필요합니다.',
        },
        clarifyingQuestions: {
          needsClarification: true,
          reason: clarificationResult.reason,
          questions: clarificationResult.questions,
        },
      };
    }

    // Step 2-4: SQL 생성 및 실행
    const sql = await this.generateSQL(userQuery);
    const { data, executionTime } = await this.executeSQL(sql);

    // 결과가 없는 경우
    if (data.length === 0) {
      this.logger.log('No results found');
      return {
        query: userQuery,
        sql,
        results: [],
        executionTime,
        insights: {
          summary: '조회 결과가 없습니다.',
          keyFindings: ['📊 해당 조건에 맞는 데이터가 없습니다'],
        },
        visualization: {
          type: 'table',
          reason: '결과가 없어 테이블로 표시합니다.',
        },
      };
    }

    // Step 5: 인사이트 생성 (병렬 처리)
    const [insights, visualization] = await Promise.all([
      this.bedrockService.generateInsights(userQuery, sql, data).catch((error) => {
        this.logger.error('Failed to generate insights, using fallback', error);
        return {
          summary: '데이터 조회가 완료되었습니다.',
          keyFindings: ['📊 쿼리가 성공적으로 실행되었습니다'],
        };
      }),
      this.bedrockService.selectVisualization(userQuery, sql, data).catch((error) => {
        this.logger.error('Failed to select visualization, using fallback', error);
        return {
          type: 'table' as const,
          reason: '데이터를 테이블 형식으로 표시합니다.',
        };
      }),
    ]);

    this.logger.log(`=== Phase 7 Enhanced Query Pipeline Complete ===`);

    return {
      query: userQuery,
      sql,
      results: data,
      executionTime,
      insights,
      visualization,
    };
  }
}
