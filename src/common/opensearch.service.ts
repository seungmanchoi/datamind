import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';

/**
 * OpenSearch Serverless Service
 * 벡터 검색을 위한 OpenSearch 연결 및 인덱스 관리
 */
@Injectable()
export class OpenSearchService implements OnModuleInit {
  private readonly logger = new Logger(OpenSearchService.name);
  private client: Client;

  constructor(private configService: ConfigService) {
    const config = this.configService.get('opensearch');

    this.client = new Client({
      node: config.node,
      auth: config.auth,
      ssl: config.ssl,
    });

    this.logger.log(`OpenSearch client initialized: ${config.node}`);
  }

  /**
   * 모듈 초기화 시 인덱스 생성
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.createIndexIfNotExists();
      this.logger.log('OpenSearch initialization completed');
    } catch (error) {
      this.logger.warn(`Failed to initialize OpenSearch: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't throw error to allow app to start even if OpenSearch is not available
    }
  }

  /**
   * products 인덱스가 없으면 생성
   */
  private async createIndexIfNotExists(): Promise<void> {
    const indexName = 'products';

    try {
      const exists = await this.client.indices.exists({ index: indexName });

      if (!exists.body) {
        this.logger.log(`Creating index: ${indexName}`);

        await this.client.indices.create({
          index: indexName,
          body: {
            settings: {
              index: {
                knn: true,
                'knn.algo_param.ef_search': 512,
                number_of_shards: 1,
                number_of_replicas: 1,
              },
            },
            mappings: {
              properties: {
                product_id: { type: 'keyword' },
                name: { type: 'text' },
                description: { type: 'text' },
                category: { type: 'keyword' },
                market_name: { type: 'text' },
                embedding: {
                  type: 'knn_vector',
                  dimension: 1536,
                  method: {
                    name: 'hnsw',
                    space_type: 'cosinesimil',
                    engine: 'nmslib',
                    parameters: {
                      ef_construction: 512,
                      m: 16,
                    },
                  },
                },
              },
            },
          },
        });

        this.logger.log(`Index created: ${indexName}`);
      } else {
        this.logger.log(`Index already exists: ${indexName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create index: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * OpenSearch 클라이언트 인스턴스 반환
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * 인덱스 존재 여부 확인
   */
  async indexExists(indexName: string): Promise<boolean> {
    try {
      const response = await this.client.indices.exists({ index: indexName });
      return response.body;
    } catch (error) {
      this.logger.error(`Failed to check index existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 인덱스 삭제
   */
  async deleteIndex(indexName: string): Promise<void> {
    try {
      await this.client.indices.delete({ index: indexName });
      this.logger.log(`Index deleted: ${indexName}`);
    } catch (error) {
      this.logger.error(`Failed to delete index: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}
