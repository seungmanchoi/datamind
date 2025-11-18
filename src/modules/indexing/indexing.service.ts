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
