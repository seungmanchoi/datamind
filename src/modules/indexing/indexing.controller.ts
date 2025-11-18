import { Controller, Logger, Param, Post } from '@nestjs/common';

import { IndexingService } from './indexing.service';

/**
 * Indexing Controller
 * 데이터 벡터화 및 인덱싱 API
 */
@Controller('indexing')
export class IndexingController {
  private readonly logger = new Logger(IndexingController.name);

  constructor(private readonly indexingService: IndexingService) {}

  /**
   * 모든 상품 데이터 인덱싱
   */
  @Post('products')
  async indexProducts() {
    this.logger.log('Received request to index all products');

    try {
      const result = await this.indexingService.indexAllProducts();

      return {
        message: 'Indexing completed',
        indexed: result.indexed,
        failed: result.failed,
        total: result.indexed + result.failed,
      };
    } catch (error) {
      this.logger.error('Failed to index products', error);
      throw error;
    }
  }

  /**
   * 특정 상품 재인덱싱
   */
  @Post('products/:id')
  async reindexProduct(@Param('id') id: string) {
    this.logger.log(`Received request to reindex product: ${id}`);

    try {
      await this.indexingService.reindexProduct(Number(id));

      return {
        message: 'Product reindexed successfully',
        productId: Number(id),
      };
    } catch (error) {
      this.logger.error(`Failed to reindex product: ${id}`, error);
      throw error;
    }
  }
}
