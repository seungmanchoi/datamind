import { Controller, Get, Logger, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { SearchService } from '@/modules/search/search.service';

/**
 * Search Controller
 * 의미 기반 검색 및 하이브리드 검색 API
 */
@ApiTags('Search')
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly searchService: SearchService) {}

  /**
   * 의미 기반 검색
   * GET /search/semantic?q=여름용 시원한 셔츠&k=10
   */
  @Get('semantic')
  @ApiOperation({
    summary: '시맨틱 검색',
    description: '벡터 임베딩 기반의 의미 기반 검색을 수행합니다.',
  })
  @ApiQuery({ name: 'query', description: '검색 질의', example: '여름용 시원한 셔츠' })
  @ApiQuery({ name: 'k', description: '반환할 결과 수', required: false, example: '10' })
  @ApiResponse({ status: 200, description: '검색 성공' })
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
  @ApiOperation({
    summary: '하이브리드 검색',
    description: '벡터 검색과 키워드 검색을 결합한 하이브리드 검색을 수행합니다.',
  })
  @ApiQuery({ name: 'q', description: '검색 질의', example: '여름용 시원한 셔츠' })
  @ApiQuery({ name: 'k', description: '반환할 결과 수', required: false, example: '10' })
  @ApiResponse({ status: 200, description: '검색 성공' })
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
  @ApiOperation({
    summary: '유사 상품 검색',
    description: '특정 상품과 유사한 상품들을 검색합니다.',
  })
  @ApiQuery({ name: 'k', description: '반환할 결과 수', required: false, example: '10' })
  @ApiResponse({ status: 200, description: '검색 성공' })
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
