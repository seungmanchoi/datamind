import { Injectable, Logger } from '@nestjs/common';

import { EmbeddingsService } from '@/common/embeddings.service';
import { OpenSearchService } from '@/common/opensearch.service';

export interface SearchResult {
  productId: number;
  name: string;
  description: string;
  category: string;
  marketName: string;
  score: number;
}

/**
 * Search Service
 * 의미 기반 검색 (Semantic Search) 및 하이브리드 검색 서비스
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly openSearchService: OpenSearchService,
  ) {}

  /**
   * 의미 기반 검색 (k-NN Vector Search)
   * @param query - 자연어 검색 질의
   * @param topK - 반환할 결과 수
   * @returns 유사도 높은 상품 목록
   */
  async semanticSearch(query: string, topK = 10): Promise<SearchResult[]> {
    this.logger.log(`Semantic search: "${query}", topK: ${topK}`);

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingsService.embedText(query);

      // k-NN search
      const client = this.openSearchService.getClient();
      const response = await client.search({
        index: 'products',
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

      const results = response.body.hits.hits.map((hit: any) => ({
        productId: hit._source.product_id,
        name: hit._source.name,
        description: hit._source.description,
        category: hit._source.category,
        marketName: hit._source.market_name,
        score: hit._score,
      }));

      this.logger.log(`Found ${results.length} results`);
      return results;
    } catch (error) {
      this.logger.error(`Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 하이브리드 검색 (Vector Search + Keyword Search)
   * @param query - 자연어 검색 질의
   * @param topK - 반환할 결과 수
   * @returns 유사도 높은 상품 목록
   */
  async hybridSearch(query: string, topK = 10): Promise<SearchResult[]> {
    this.logger.log(`Hybrid search: "${query}", topK: ${topK}`);

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingsService.embedText(query);

      // Hybrid: Vector search + keyword search
      const client = this.openSearchService.getClient();
      const response = await client.search({
        index: 'products',
        body: {
          size: topK,
          query: {
            bool: {
              should: [
                {
                  // Vector search
                  knn: {
                    embedding: {
                      vector: queryEmbedding,
                      k: topK * 2,
                    },
                  },
                },
                {
                  // Keyword search (multi-field)
                  multi_match: {
                    query,
                    fields: ['name^3', 'description', 'category^2', 'market_name'],
                    type: 'best_fields',
                    fuzziness: 'AUTO',
                  },
                },
              ],
            },
          },
        },
      });

      const results = response.body.hits.hits.map((hit: any) => ({
        productId: hit._source.product_id,
        name: hit._source.name,
        description: hit._source.description,
        category: hit._source.category,
        marketName: hit._source.market_name,
        score: hit._score,
      }));

      this.logger.log(`Found ${results.length} hybrid results`);
      return results;
    } catch (error) {
      this.logger.error(`Hybrid search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 유사 상품 검색 (Product ID 기반)
   * @param productId - 기준 상품 ID
   * @param topK - 반환할 결과 수
   * @returns 유사한 상품 목록
   */
  async findSimilarProducts(productId: number, topK = 10): Promise<SearchResult[]> {
    this.logger.log(`Finding similar products for: ${productId}, topK: ${topK}`);

    try {
      const client = this.openSearchService.getClient();

      // Get the product's embedding
      const productDoc = await client.get({
        index: 'products',
        id: productId.toString(),
      });

      if (!productDoc.body._source?.embedding) {
        throw new Error(`Product not found in index: ${productId}`);
      }

      const productEmbedding = productDoc.body._source.embedding;

      // Search for similar products
      const response = await client.search({
        index: 'products',
        body: {
          size: topK + 1, // +1 to exclude the product itself
          query: {
            knn: {
              embedding: {
                vector: productEmbedding,
                k: topK + 1,
              },
            },
          },
        },
      });

      // Filter out the original product and map results
      const results = response.body.hits.hits
        .filter((hit: any) => hit._source.product_id !== productId)
        .slice(0, topK)
        .map((hit: any) => ({
          productId: hit._source.product_id,
          name: hit._source.name,
          description: hit._source.description,
          category: hit._source.category,
          marketName: hit._source.market_name,
          score: hit._score,
        }));

      this.logger.log(`Found ${results.length} similar products`);
      return results;
    } catch (error) {
      this.logger.error(`Finding similar products failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}
