import { Injectable, Logger } from '@nestjs/common';

import { EmbeddingsService } from '@/common/embeddings.service';
import { OpenSearchService } from '@/common/opensearch.service';

export interface SqlExample {
  description: string;
  sql: string;
  score?: number;
}

export interface RagContext {
  examples: SqlExample[];
  formattedContext: string;
}

/**
 * RAG Service
 * Text-to-SQL을 위한 유사 예제 검색 및 컨텍스트 생성
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly indexName = 'sql-examples';

  constructor(
    private opensearchService: OpenSearchService,
    private embeddingsService: EmbeddingsService,
  ) {}

  /**
   * 자연어 질의에 대한 유사 SQL 예제 검색
   * @param query 사용자 질문 (자연어)
   * @param topK 상위 K개 결과 (기본값: 5)
   * @returns 유사 SQL 예제 배열
   */
  async searchSimilarExamples(query: string, topK: number = 5): Promise<SqlExample[]> {
    try {
      // 1. 질문을 벡터로 임베딩
      this.logger.log('┌' + '─'.repeat(58) + '┐');
      this.logger.log(`│ 🔍 OpenSearch RAG 검색 시작`);
      this.logger.log('├' + '─'.repeat(58) + '┤');
      this.logger.log(`│ Query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
      this.logger.log(`│ Index: ${this.indexName}`);
      this.logger.log(`│ TopK: ${topK}`);
      this.logger.log('├' + '─'.repeat(58) + '┤');

      const startTime = Date.now();
      const queryEmbedding = await this.embeddingsService.embedText(query);
      const embeddingTime = Date.now() - startTime;
      this.logger.log(`│ ✅ Embedding 생성 완료 (${embeddingTime}ms, dim: ${queryEmbedding.length})`);

      // 2. OpenSearch k-NN 검색
      const searchStartTime = Date.now();
      const client = this.opensearchService.getClient();
      const searchResponse = await client.search({
        index: this.indexName,
        body: {
          size: topK,
          query: {
            knn: {
              embedding: {
                vector: queryEmbedding,
                k: topK,
              },
            },
          },
        },
      });
      const searchTime = Date.now() - searchStartTime;

      const hits = searchResponse.body.hits.hits;
      this.logger.log(`│ ✅ k-NN 검색 완료 (${searchTime}ms, hits: ${hits.length})`);

      if (hits.length === 0) {
        this.logger.warn('│ ⚠️ 검색 결과 없음');
        this.logger.log('└' + '─'.repeat(58) + '┘');
        return [];
      }

      // 3. 결과 변환
      // 저장 구조: description(예제 설명), sql(SQL 쿼리), embedding
      interface OpenSearchHit {
        _source: { description: string; sql: string };
        _score: number;
      }
      const typedHits = hits as unknown as OpenSearchHit[];
      const examples: SqlExample[] = typedHits.map((hit) => ({
        description: hit._source.description,
        sql: hit._source.sql,
        score: hit._score,
      }));

      this.logger.log('├' + '─'.repeat(58) + '┤');
      this.logger.log(`│ 📊 검색 결과 요약`);
      this.logger.log(`│ - 총 ${examples.length}개 예제 발견`);
      this.logger.log(`│ - 최고 유사도: ${examples[0]?.score?.toFixed(4)}`);
      this.logger.log(`│ - 최저 유사도: ${examples[examples.length - 1]?.score?.toFixed(4)}`);
      this.logger.log(`│ - 총 소요시간: ${embeddingTime + searchTime}ms`);
      this.logger.log('└' + '─'.repeat(58) + '┘');

      return examples;
    } catch (error) {
      this.logger.error(
        `Failed to search similar examples: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * RAG 컨텍스트 생성 (Few-Shot Learning용)
   * @param query 사용자 질문
   * @param topK 상위 K개 예제
   * @returns RAG 컨텍스트 및 예제
   */
  async getRagContext(query: string, topK: number = 5): Promise<RagContext> {
    const examples = await this.searchSimilarExamples(query, topK);

    if (examples.length === 0) {
      return {
        examples: [],
        formattedContext: '',
      };
    }

    // Few-Shot 형식으로 포맷팅
    const formattedContext = this.formatExamplesForPrompt(examples);

    return {
      examples,
      formattedContext,
    };
  }

  /**
   * SQL 예제를 프롬프트용 텍스트로 포맷팅
   * @param examples SQL 예제 배열
   * @returns 포맷팅된 컨텍스트 문자열
   */
  private formatExamplesForPrompt(examples: SqlExample[]): string {
    const formattedExamples = examples
      .map((example, idx) => `${idx + 1}. Description: ${example.description}\n   SQL: ${example.sql}`)
      .join('\n\n');

    return `다음은 유사한 질의에 대한 SQL 예제들입니다:\n\n${formattedExamples}`;
  }

  /**
   * 특정 카테고리 또는 조건으로 필터링된 예제 검색
   * @param query 사용자 질문
   * @param filters 필터 조건 (예: 특정 테이블, 날짜 범위 등)
   * @param topK 상위 K개
   * @returns 필터링된 SQL 예제
   */
  async searchWithFilters(query: string, filters: Record<string, any>, topK: number = 5): Promise<SqlExample[]> {
    try {
      const queryEmbedding = await this.embeddingsService.embedText(query);

      // 필터 조건 구성
      const mustClauses = Object.entries(filters).map(([field, value]) => ({
        term: { [field]: value },
      }));

      const client = this.opensearchService.getClient();
      const searchResponse = await client.search({
        index: this.indexName,
        body: {
          size: topK,
          query: {
            bool: {
              must: [
                {
                  knn: {
                    embedding: {
                      vector: queryEmbedding,
                      k: topK,
                    },
                  },
                },
                ...mustClauses,
              ],
            },
          },
        },
      });

      const hits = searchResponse.body.hits.hits;

      interface FilteredHit {
        _source: { description: string; sql: string };
        _score: number;
      }
      const typedHits = hits as unknown as FilteredHit[];

      return typedHits.map((hit) => ({
        description: hit._source.description,
        sql: hit._source.sql,
        score: hit._score,
      }));
    } catch (error) {
      this.logger.error(`Failed to search with filters: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}
