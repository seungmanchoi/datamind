import { HumanMessage } from '@langchain/core/messages';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { createBedrockChatModel } from '@/agents/config/langchain.config';
import { EmbeddingsService } from '@/common/embeddings.service';
import { OpenSearchService } from '@/common/opensearch.service';

import {
  FailedQueryDto,
  PaginatedFailedQueriesDto,
  QueryLearningRequestDto,
  QueryLearningResponseDto,
  ResolveFailedQueryDto,
} from './dto';
import { FailedQuery, FailedQueryAttempt, QueryValidationResult } from './interfaces/failed-query.interface';

const MAX_ATTEMPTS = 5;
const FAILED_QUERIES_INDEX = 'failed_queries';
const SQL_EXAMPLES_INDEX = 'sql-examples';

/**
 * Query Learning Service
 * 실패 쿼리 학습 및 관리
 */
@Injectable()
export class QueryLearningService {
  private readonly logger = new Logger(QueryLearningService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly opensearchService: OpenSearchService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  /**
   * 실패 쿼리 학습 요청 처리
   */
  async learnFailedQuery(dto: QueryLearningRequestDto): Promise<QueryLearningResponseDto> {
    this.logger.log(`[QueryLearning] 학습 시작: "${dto.originalQuery.substring(0, 50)}..."`);

    const attempts: FailedQueryAttempt[] = [];
    let lastError = dto.errorMessage;

    // 최대 5회 시도
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      this.logger.log(`[QueryLearning] 시도 ${attempt}/${MAX_ATTEMPTS}`);

      try {
        // 1. 보정된 SQL 생성
        const correctedSql = await this.generateCorrectedSql(dto.originalQuery, dto.failedSql, lastError, attempt);

        this.logger.log(`[QueryLearning] 생성된 SQL: ${correctedSql.substring(0, 100)}...`);

        // 2. SQL 검증
        const validation = await this.validateQuery(correctedSql);

        // 시도 기록
        attempts.push({
          attemptNumber: attempt,
          correctedSql,
          errorMessage: validation.error || '',
          timestamp: new Date(),
        });

        if (validation.success) {
          this.logger.log(`[QueryLearning] 검증 성공! (시도 ${attempt})`);

          // 3. Description 생성
          const description = await this.generateDescription(correctedSql, dto.originalQuery);

          // 4. RAG 임베딩 저장
          await this.embedToRag(description, correctedSql);

          return {
            success: true,
            correctedSql,
            description,
            attempts: attempt,
            embedded: true,
            message: `쿼리가 성공적으로 학습되었습니다. (${attempt}회 시도)`,
          };
        }

        // 실패 시 에러 메시지 업데이트
        lastError = validation.error || 'Unknown error';
        this.logger.warn(`[QueryLearning] 검증 실패 (시도 ${attempt}): ${lastError}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`[QueryLearning] 시도 ${attempt} 오류: ${errorMsg}`);

        attempts.push({
          attemptNumber: attempt,
          correctedSql: '',
          errorMessage: errorMsg,
          timestamp: new Date(),
        });

        lastError = errorMsg;
      }
    }

    // 5회 실패 시 failed_queries 인덱스에 저장
    this.logger.warn(`[QueryLearning] ${MAX_ATTEMPTS}회 시도 후에도 실패 - 저장소에 기록`);

    const failedQueryId = await this.saveFailedQuery({
      id: uuidv4(),
      originalQuery: dto.originalQuery,
      failedSql: dto.failedSql,
      errorMessage: dto.errorMessage,
      errorCode: dto.errorCode,
      attempts,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      success: false,
      attempts: MAX_ATTEMPTS,
      embedded: false,
      failedQueryId,
      message: `${MAX_ATTEMPTS}회 시도 후에도 유효한 쿼리를 생성하지 못했습니다. 관리자 검토가 필요합니다.`,
    };
  }

  /**
   * 보정된 SQL 생성
   */
  private async generateCorrectedSql(
    originalQuery: string,
    failedSql: string,
    errorMessage: string,
    attempt: number,
  ): Promise<string> {
    const model = createBedrockChatModel({ temperature: 0.1 });

    // DB 스키마 조회
    const schema = await this.getDbSchema();

    const prompt = `당신은 SQL 쿼리 보정 전문가입니다.

## 역할
실패한 SQL 쿼리를 분석하고, 올바르게 동작하는 쿼리로 수정합니다.

## 입력 정보
- 원본 질문: ${originalQuery}
- 실패한 SQL: ${failedSql}
- 에러 메시지: ${errorMessage}
- 시도 횟수: ${attempt}/${MAX_ATTEMPTS}

## DB 스키마
${schema}

## 지침
1. 에러 메시지를 분석하여 실패 원인 파악
2. 스키마를 참조하여 올바른 테이블/컬럼명 확인
3. JOIN, GROUP BY, ORDER BY 조건 검증
4. 수정된 SQL만 출력 (설명 없이)

## 일반적인 오류 패턴
- 존재하지 않는 컬럼명 → 스키마에서 올바른 컬럼명 확인
- 잘못된 JOIN 조건 → 외래키 관계 확인
- GROUP BY 누락 → 집계 함수 사용 시 필수
- 날짜 형식 오류 → MySQL 날짜 함수 사용

## 출력
수정된 SQL 쿼리만 출력하세요. 설명이나 마크다운 없이 순수 SQL만 출력합니다.`;

    const response = await model.invoke([new HumanMessage({ content: prompt })]);
    let sql = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    // SQL 정리 (마크다운 코드 블록 제거)
    sql = sql
      .replace(/```sql\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    return sql;
  }

  /**
   * SQL 쿼리 검증
   */
  private async validateQuery(sql: string): Promise<QueryValidationResult> {
    try {
      // EXPLAIN으로 문법 검증
      await this.dataSource.query(`EXPLAIN ${sql}`);

      // 실제 실행 (LIMIT 1로 제한)
      const limitedSql = sql.replace(/;?\s*$/, '') + ' LIMIT 1';
      const result = await this.dataSource.query(limitedSql);

      return {
        success: true,
        rowCount: result.length,
        columns: result.length > 0 ? Object.keys(result[0]) : [],
      };
    } catch (error) {
      const err = error as { message?: string; code?: string };
      return {
        success: false,
        error: err.message || 'Unknown error',
        errorCode: err.code,
      };
    }
  }

  /**
   * Description 생성
   */
  private async generateDescription(sql: string, originalQuery: string): Promise<string> {
    const model = createBedrockChatModel({ temperature: 0 });

    const prompt = `SQL 쿼리에 대한 간단한 설명을 생성하세요.

## SQL 쿼리
${sql}

## 원본 질문
${originalQuery}

## 출력
한국어로 50자 이내의 간결한 설명을 작성하세요. 설명만 출력하세요.`;

    const response = await model.invoke([new HumanMessage({ content: prompt })]);
    const description = typeof response.content === 'string' ? response.content : String(response.content);

    return description.trim();
  }

  /**
   * RAG 임베딩 저장
   */
  private async embedToRag(description: string, sql: string): Promise<void> {
    try {
      // 임베딩 생성
      const embedding = await this.embeddingsService.embedText(description);

      // OpenSearch에 저장
      const client = this.opensearchService.getClient();
      await client.index({
        index: SQL_EXAMPLES_INDEX,
        body: {
          description,
          sql,
          embedding,
          createdAt: new Date().toISOString(),
          source: 'query_learning',
        },
      });

      this.logger.log(`[QueryLearning] RAG 임베딩 저장 완료: ${description}`);
    } catch (error) {
      this.logger.error(`[QueryLearning] RAG 임베딩 저장 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 실패 쿼리 저장
   */
  private async saveFailedQuery(failedQuery: FailedQuery): Promise<string> {
    try {
      const client = this.opensearchService.getClient();

      await client.index({
        index: FAILED_QUERIES_INDEX,
        id: failedQuery.id,
        body: failedQuery,
        refresh: true,
      });

      this.logger.log(`[QueryLearning] 실패 쿼리 저장: ${failedQuery.id}`);
      return failedQuery.id;
    } catch (error) {
      this.logger.error(`[QueryLearning] 실패 쿼리 저장 오류: ${error}`);
      throw error;
    }
  }

  /**
   * DB 스키마 조회
   */
  private async getDbSchema(): Promise<string> {
    try {
      const tables = await this.dataSource.query('SHOW TABLES');
      const tableNames = tables.map((t: Record<string, string>) => Object.values(t)[0]);

      const schemaInfo: string[] = [];

      for (const tableName of tableNames.slice(0, 10)) {
        // 최대 10개 테이블
        const columns = await this.dataSource.query(`DESCRIBE ${tableName}`);
        const columnInfo = columns.map((c: { Field: string; Type: string }) => `${c.Field} (${c.Type})`).join(', ');
        schemaInfo.push(`${tableName}: ${columnInfo}`);
      }

      return schemaInfo.join('\n');
    } catch (error) {
      this.logger.error(`[QueryLearning] 스키마 조회 실패: ${error}`);
      return '';
    }
  }

  /**
   * 실패 쿼리 목록 조회
   */
  async getFailedQueries(filter: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedFailedQueriesDto> {
    const { status = 'all', page = 1, limit = 20 } = filter;

    try {
      const client = this.opensearchService.getClient();

      const query: Record<string, unknown> = status === 'all' ? { match_all: {} } : { term: { status } };

      const response = await client.search({
        index: FAILED_QUERIES_INDEX,
        body: {
          query,
          from: (page - 1) * limit,
          size: limit,
          sort: [{ createdAt: { order: 'desc' } }],
        },
      });

      interface OpenSearchHit {
        _source: FailedQueryDto;
      }

      const hits = response.body.hits.hits as unknown as OpenSearchHit[];
      const totalHits = response.body.hits.total;
      const total = typeof totalHits === 'number' ? totalHits : totalHits.value;

      return {
        data: hits.map((hit) => hit._source),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      // 인덱스가 없는 경우 빈 결과 반환
      this.logger.warn(`[QueryLearning] 실패 쿼리 조회 오류: ${error}`);
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  }

  /**
   * 실패 쿼리 상세 조회
   */
  async getFailedQueryById(id: string): Promise<FailedQueryDto | null> {
    try {
      const client = this.opensearchService.getClient();

      const response = await client.get({
        index: FAILED_QUERIES_INDEX,
        id,
      });

      return response.body._source as FailedQueryDto;
    } catch (error) {
      this.logger.warn(`[QueryLearning] 실패 쿼리 조회 실패: ${id}`);
      return null;
    }
  }

  /**
   * 실패 쿼리 수동 해결
   */
  async resolveFailedQuery(id: string, dto: ResolveFailedQueryDto): Promise<{ success: boolean; message: string }> {
    try {
      const client = this.opensearchService.getClient();

      // 기존 쿼리 조회
      const existing = await this.getFailedQueryById(id);
      if (!existing) {
        return { success: false, message: '실패 쿼리를 찾을 수 없습니다.' };
      }

      // SQL 검증
      if (dto.resolvedSql) {
        const validation = await this.validateQuery(dto.resolvedSql);
        if (!validation.success) {
          return { success: false, message: `SQL 검증 실패: ${validation.error}` };
        }

        // RAG 임베딩 저장
        const description = await this.generateDescription(dto.resolvedSql, existing.originalQuery);
        await this.embedToRag(description, dto.resolvedSql);
      }

      // 상태 업데이트
      await client.update({
        index: FAILED_QUERIES_INDEX,
        id,
        body: {
          doc: {
            status: 'resolved',
            resolvedSql: dto.resolvedSql,
            notes: dto.notes,
            resolvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        refresh: true,
      });

      return { success: true, message: '실패 쿼리가 해결되었습니다.' };
    } catch (error) {
      this.logger.error(`[QueryLearning] 실패 쿼리 해결 오류: ${error}`);
      return { success: false, message: '처리 중 오류가 발생했습니다.' };
    }
  }

  /**
   * 실패 쿼리 무시 처리
   */
  async ignoreFailedQuery(id: string): Promise<{ success: boolean }> {
    try {
      const client = this.opensearchService.getClient();

      await client.update({
        index: FAILED_QUERIES_INDEX,
        id,
        body: {
          doc: {
            status: 'ignored',
            updatedAt: new Date().toISOString(),
          },
        },
        refresh: true,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`[QueryLearning] 실패 쿼리 무시 오류: ${error}`);
      return { success: false };
    }
  }

  /**
   * 실패 쿼리 삭제
   */
  async deleteFailedQuery(id: string): Promise<{ success: boolean }> {
    try {
      const client = this.opensearchService.getClient();

      await client.delete({
        index: FAILED_QUERIES_INDEX,
        id,
        refresh: true,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`[QueryLearning] 실패 쿼리 삭제 오류: ${error}`);
      return { success: false };
    }
  }

  /**
   * 동일 쿼리 임베딩 존재 여부 확인
   */
  async checkDuplicateEmbedding(sql: string): Promise<{
    exists: boolean;
    similarQueries?: { description: string; sql: string; score: number }[];
  }> {
    try {
      // SQL 쿼리에서 설명 생성
      const description = await this.generateDescription(sql, '');

      // 임베딩 생성
      const embedding = await this.embeddingsService.embedText(description);

      // OpenSearch에서 유사도 검색
      const client = this.opensearchService.getClient();
      const response = await client.search({
        index: SQL_EXAMPLES_INDEX,
        body: {
          size: 3,
          query: {
            script_score: {
              query: { match_all: {} },
              script: {
                source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                params: { query_vector: embedding },
              },
            },
          },
        },
      });

      interface OpenSearchHit {
        _score: number;
        _source: { description: string; sql: string };
      }

      const hits = response.body.hits.hits as unknown as OpenSearchHit[];

      // 유사도 0.95 이상이면 중복으로 간주 (score는 1.0~2.0 범위)
      const duplicates = hits.filter((hit) => hit._score >= 1.95);

      if (duplicates.length > 0) {
        return {
          exists: true,
          similarQueries: duplicates.map((hit) => ({
            description: hit._source.description,
            sql: hit._source.sql,
            score: hit._score - 1.0, // 0~1 범위로 변환
          })),
        };
      }

      return { exists: false };
    } catch (error) {
      this.logger.warn(`[QueryLearning] 중복 검증 오류: ${error}`);
      // 오류 시 중복 없음으로 처리
      return { exists: false };
    }
  }

  /**
   * 실패 쿼리 인덱스 생성 (초기 설정용)
   */
  async createFailedQueriesIndex(): Promise<void> {
    try {
      const client = this.opensearchService.getClient();

      const exists = await client.indices.exists({ index: FAILED_QUERIES_INDEX });
      if (exists.body) {
        this.logger.log(`[QueryLearning] ${FAILED_QUERIES_INDEX} 인덱스 이미 존재`);
        return;
      }

      await client.indices.create({
        index: FAILED_QUERIES_INDEX,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 2, // Zone awareness 3개 AZ 대응 (1 shard + 2 replicas = 3 copies)
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              originalQuery: { type: 'text' },
              failedSql: { type: 'text' },
              errorMessage: { type: 'text' },
              errorCode: { type: 'keyword' },
              attempts: {
                type: 'nested',
                properties: {
                  attemptNumber: { type: 'integer' },
                  correctedSql: { type: 'text' },
                  errorMessage: { type: 'text' },
                  timestamp: { type: 'date' },
                },
              },
              status: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              resolvedAt: { type: 'date' },
              resolvedBy: { type: 'keyword' },
              resolvedSql: { type: 'text' },
              notes: { type: 'text' },
            },
          },
        },
      });

      this.logger.log(`[QueryLearning] ${FAILED_QUERIES_INDEX} 인덱스 생성 완료`);
    } catch (error) {
      this.logger.error(`[QueryLearning] 인덱스 생성 오류: ${error}`);
      throw error;
    }
  }
}
