import { Controller, Get, Logger, Param, Query } from '@nestjs/common';

import { SearchService } from '@/modules/search/search.service';

/**
 * Search Controller
 * 의미 기반 검색 및 하이브리드 검색 API
 */
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly searchService: SearchService) {}

  /**
   * 의미 기반 검색
   * GET /search/semantic?q=여름용 시원한 셔츠&k=10
   */
  @Get('semantic')
  async semanticSearch(@Query('query') query: string, @Query('k') topK?: string) {
    this.logger.log(`Semantic search request: "${query}"`);

    if (!query) {
      return {
        error: 'Query parameter "q" is required',
      };
    }

    try {
      const k = topK ? parseInt(topK, 10) : 10;
      const results = await this.searchService.semanticSearch(query, k);

      return {
        query,
        topK: k,
        count: results.length,
        results,
      };
    } catch (error) {
      this.logger.error('Semantic search failed', error);
      throw error;
    }
  }

  /**
   * 하이브리드 검색 (벡터 + 키워드)
   * GET /search/hybrid?q=여름용 시원한 셔츠&k=10
   */
  @Get('hybrid')
  async hybridSearch(@Query('q') query: string, @Query('k') topK?: string) {
    this.logger.log(`Hybrid search request: "${query}"`);

    if (!query) {
      return {
        error: 'Query parameter "q" is required',
      };
    }

    try {
      const k = topK ? parseInt(topK, 10) : 10;
      const results = await this.searchService.hybridSearch(query, k);

      return {
        query,
        topK: k,
        count: results.length,
        results,
      };
    } catch (error) {
      this.logger.error('Hybrid search failed', error);
      throw error;
    }
  }

  /**
   * 유사 상품 검색
   * GET /search/similar/:id?k=10
   */
  @Get('similar/:id')
  async findSimilarProducts(@Param('id') id: string, @Query('k') topK?: string) {
    this.logger.log(`Find similar products request: ${id}`);

    try {
      const productId = parseInt(id, 10);
      const k = topK ? parseInt(topK, 10) : 10;

      const results = await this.searchService.findSimilarProducts(productId, k);

      return {
        productId,
        topK: k,
        count: results.length,
        results,
      };
    } catch (error) {
      this.logger.error('Find similar products failed', error);
      throw error;
    }
  }
}
