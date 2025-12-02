import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { EmbeddingsService } from '@/common/embeddings.service';
import { OpenSearchService } from '@/common/opensearch.service';

interface Product {
  id: number;
  product_name: string;
  description?: string;
  category_name?: string;
  market_name?: string;
}

/**
 * Indexing Service
 * MySQL 상품 데이터를 벡터화하여 OpenSearch에 인덱싱
 */
@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);
  private readonly sqlExamplesIndex = 'sql-examples';

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly embeddingsService: EmbeddingsService,
    private readonly openSearchService: OpenSearchService,
  ) {}

  /**
   * 모든 상품 데이터 인덱싱
   */
  async indexAllProducts(): Promise<{ indexed: number; failed: number }> {
    const batchSize = 100;
    let offset = 0;
    let indexed = 0;
    let failed = 0;

    this.logger.log('Starting product indexing...');

    try {
      while (true) {
        const products = await this.fetchProductBatch(batchSize, offset);

        if (products.length === 0) {
          this.logger.log('No more products to index');
          break;
        }

        this.logger.log(`Processing batch: ${offset} - ${offset + products.length}`);

        try {
          await this.indexProductBatch(products);
          indexed += products.length;
          this.logger.log(`Successfully indexed ${products.length} products`);
        } catch (error) {
          this.logger.error(`Batch indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failed += products.length;
        }

        offset += batchSize;
      }

      this.logger.log(`Indexing completed: ${indexed} indexed, ${failed} failed`);
      return { indexed, failed };
    } catch (error) {
      this.logger.error(`Indexing process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 상품 데이터 배치 조회
   */
  private async fetchProductBatch(limit: number, offset: number): Promise<Product[]> {
    const sql = `
      SELECT
        p.id,
        p.product_name,
        p.product_info as description,
        c.category_name,
        m.market_name
      FROM product p
      LEFT JOIN category c ON p.category_id = c.id
      LEFT JOIN market m ON p.market_id = m.id
      WHERE p.is_deleted = 0
      ORDER BY p.id
      LIMIT ? OFFSET ?
    `;

    return this.dataSource.query(sql, [limit, offset]);
  }

  /**
   * 상품 배치를 임베딩하여 OpenSearch에 인덱싱
   */
  private async indexProductBatch(products: Product[]): Promise<void> {
    // Create text representations
    const texts = products.map((p) => this.createProductText(p));

    // Generate embeddings
    const embeddings = await this.embeddingsService.embedBatch(texts);

    // Bulk index to OpenSearch
    const body = products.flatMap((product, index) => [
      { index: { _index: 'products', _id: product.id.toString() } },
      {
        product_id: product.id,
        name: product.product_name,
        description: product.description || '',
        category: product.category_name || '',
        market_name: product.market_name || '',
        embedding: embeddings[index],
      },
    ]);

    const client = this.openSearchService.getClient();
    const response = await client.bulk({ body });

    if (response.body.errors) {
      this.logger.warn('Some documents failed to index');
      const failedDocs = response.body.items.filter((item: any) => item.index?.error);
      this.logger.error(`Failed documents: ${JSON.stringify(failedDocs)}`);
    }
  }

  /**
   * 상품 데이터를 검색 가능한 텍스트로 변환
   */
  private createProductText(product: Product): string {
    const parts = [
      product.product_name,
      product.description || '',
      product.category_name || '',
      product.market_name || '',
    ];

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Few-shot 예제 임베딩 및 저장
   */
  async embedExample(example: {
    description: string;
    sql: string;
  }): Promise<{ id: string; description: string; sql: string; processingTime: number }> {
    const startTime = Date.now();
    this.logger.log(`Embedding few-shot example: ${example.description.substring(0, 50)}...`);

    try {
      // description을 임베딩 (유사 질의 검색에 사용됨)
      const descriptionEmbedding = await this.embeddingsService.embedText(example.description);

      // OpenSearch에 저장
      const client = this.openSearchService.getClient();
      const id = `example_${Date.now()}`;

      await client.index({
        index: this.sqlExamplesIndex,
        id,
        body: {
          description: example.description,
          sql: example.sql,
          embedding: descriptionEmbedding,
          created_at: new Date().toISOString(),
        },
      });

      const processingTime = Date.now() - startTime;
      this.logger.log(`Few-shot example embedded successfully in ${processingTime}ms`);

      return {
        id,
        description: example.description,
        sql: example.sql,
        processingTime,
      };
    } catch (error) {
      this.logger.error(`Failed to embed example: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Few-shot 예제 수정
   * description이 변경된 경우에만 재임베딩
   */
  async updateExample(
    id: string,
    data: { description: string; sql: string },
  ): Promise<{
    id: string;
    description: string;
    sql: string;
    reembedded: boolean;
    processingTime: number;
  }> {
    const startTime = Date.now();
    this.logger.log(`Updating example: ${id}`);

    try {
      const client = this.openSearchService.getClient();

      // 기존 문서 조회
      const existingDoc = await client.get({
        index: this.sqlExamplesIndex,
        id,
      });

      if (!existingDoc.body.found) {
        throw new Error(`Example not found: ${id}`);
      }

      const existingData = existingDoc.body._source as {
        description: string;
        sql: string;
        embedding: number[];
        created_at: string;
      };

      // description 변경 여부 확인
      const descriptionChanged = existingData.description !== data.description;
      let embedding = existingData.embedding;

      // description이 변경된 경우에만 재임베딩
      if (descriptionChanged) {
        this.logger.log('Description changed, re-embedding...');
        embedding = await this.embeddingsService.embedText(data.description);
      }

      // 문서 업데이트
      await client.index({
        index: this.sqlExamplesIndex,
        id,
        body: {
          description: data.description,
          sql: data.sql,
          embedding,
          created_at: existingData.created_at,
          updated_at: new Date().toISOString(),
        },
      });

      const processingTime = Date.now() - startTime;
      this.logger.log(`Example updated successfully in ${processingTime}ms (reembedded: ${descriptionChanged})`);

      return {
        id,
        description: data.description,
        sql: data.sql,
        reembedded: descriptionChanged,
        processingTime,
      };
    } catch (error) {
      this.logger.error(`Failed to update example: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Few-shot 예제 조회 (페이징)
   */
  async getAllExamples(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    examples: Array<{
      id: string;
      description: string;
      sql: string;
      createdAt: string;
      updatedAt?: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logger.log(`Getting few-shot examples (page: ${page}, limit: ${limit})`);

    try {
      const client = this.openSearchService.getClient();

      // 인덱스 존재 여부 확인
      const indexExists = await this.openSearchService.indexExists(this.sqlExamplesIndex);
      if (!indexExists) {
        this.logger.log('sql-examples index does not exist');
        return { examples: [], total: 0, page, limit, totalPages: 0 };
      }

      // OpenSearch 페이징: from = (page - 1) * limit
      const from = (page - 1) * limit;

      const response = await client.search({
        index: this.sqlExamplesIndex,
        body: {
          query: { match_all: {} },
          from,
          size: limit,
          sort: [{ created_at: { order: 'desc' } }],
          _source: ['description', 'sql', 'created_at', 'updated_at'],
        },
      });

      const hits = response.body.hits.hits;
      const examples = hits
        .filter((hit: { _id: string; _source?: Record<string, unknown> }) => hit._source)
        .map((hit: { _id: string; _source?: Record<string, unknown> }) => ({
          id: hit._id,
          description: (hit._source?.description as string) || '',
          sql: (hit._source?.sql as string) || '',
          createdAt: (hit._source?.created_at as string) || '',
          updatedAt: (hit._source?.updated_at as string) || undefined,
        }));

      this.logger.log(`Found ${examples.length} examples on page ${page}`);

      // total이 number 또는 { value: number } 형태일 수 있음
      const total = response.body.hits.total;
      const totalCount = typeof total === 'number' ? total : total?.value || examples.length;
      const totalPages = Math.ceil(totalCount / limit);

      return {
        examples,
        total: totalCount,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to get examples: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 특정 예제 삭제
   */
  async deleteExample(id: string): Promise<void> {
    this.logger.log(`Deleting example: ${id}`);

    try {
      const client = this.openSearchService.getClient();
      await client.delete({
        index: this.sqlExamplesIndex,
        id,
      });

      this.logger.log(`Example deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete example: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 모든 예제 삭제
   */
  async deleteAllExamples(): Promise<{ deleted: boolean; message: string }> {
    this.logger.log('Deleting all examples...');

    try {
      const indexExists = await this.openSearchService.indexExists(this.sqlExamplesIndex);

      if (!indexExists) {
        this.logger.log('sql-examples index does not exist, nothing to delete');
        return { deleted: false, message: '삭제할 예제가 없습니다.' };
      }

      // 인덱스 삭제
      await this.openSearchService.deleteIndex(this.sqlExamplesIndex);
      this.logger.log('sql-examples index deleted successfully');

      // 인덱스 재생성
      await this.recreateSqlExamplesIndex();
      this.logger.log('sql-examples index recreated successfully');

      return { deleted: true, message: '모든 예제가 삭제되었습니다.' };
    } catch (error) {
      this.logger.error(`Failed to delete all examples: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * sql-examples 인덱스 재생성
   */
  private async recreateSqlExamplesIndex(): Promise<void> {
    const client = this.openSearchService.getClient();

    await client.indices.create({
      index: this.sqlExamplesIndex,
      body: {
        settings: {
          index: {
            knn: true,
            number_of_shards: 1,
            number_of_replicas: 2,
          },
        },
        mappings: {
          properties: {
            description: { type: 'text' },
            sql: { type: 'text' },
            created_at: { type: 'date' },
            embedding: {
              type: 'knn_vector',
              dimension: 1536,
              method: {
                name: 'hnsw',
                space_type: 'l2',
                engine: 'lucene',
                parameters: {
                  ef_construction: 128,
                  m: 16,
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * 모든 임베딩 삭제 (인덱스 삭제 후 재생성)
   */
  async deleteAllEmbeddings(): Promise<{ deleted: boolean; message: string }> {
    this.logger.log('Deleting all embeddings...');

    try {
      const indexName = 'products';
      const exists = await this.openSearchService.indexExists(indexName);

      if (!exists) {
        this.logger.log('Index does not exist, nothing to delete');
        return { deleted: false, message: '삭제할 임베딩 데이터가 없습니다.' };
      }

      // 인덱스 삭제
      await this.openSearchService.deleteIndex(indexName);
      this.logger.log('Index deleted successfully');

      // 인덱스 재생성 (빈 상태)
      await this.recreateProductsIndex();
      this.logger.log('Index recreated successfully');

      return { deleted: true, message: '모든 임베딩이 삭제되었습니다.' };
    } catch (error) {
      this.logger.error(`Failed to delete all embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * products 인덱스 재생성
   */
  private async recreateProductsIndex(): Promise<void> {
    const client = this.openSearchService.getClient();
    const indexName = 'products';

    await client.indices.create({
      index: indexName,
      body: {
        settings: {
          index: {
            knn: true,
            number_of_shards: 1,
            number_of_replicas: 2,
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
                space_type: 'l2',
                engine: 'lucene',
                parameters: {
                  ef_construction: 128,
                  m: 16,
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * 특정 상품 재인덱싱
   */
  async reindexProduct(productId: number): Promise<void> {
    this.logger.log(`Reindexing product: ${productId}`);

    const products = await this.dataSource.query(
      `
      SELECT
        p.id,
        p.product_name,
        p.product_info as description,
        c.category_name,
        m.market_name
      FROM product p
      LEFT JOIN category c ON p.category_id = c.id
      LEFT JOIN market m ON p.market_id = m.id
      WHERE p.id = ? AND p.is_deleted = 0
    `,
      [productId],
    );

    if (products.length === 0) {
      throw new Error(`Product not found: ${productId}`);
    }

    await this.indexProductBatch(products);
    this.logger.log(`Product reindexed: ${productId}`);
  }
}
