import { Body, Controller, Delete, Get, Logger, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import {
  DeleteEmbeddingsResponseDto,
  EmbedExampleRequestDto,
  EmbedExampleResponseDto,
  ExampleListResponseDto,
  UpdateExampleRequestDto,
  UpdateExampleResponseDto,
} from '@/modules/indexing/dto/embed-text.dto';
import { IndexingService } from '@/modules/indexing/indexing.service';

/**
 * Indexing Controller
 * Few-shot 예제 임베딩 관리 API
 */
@ApiTags('Indexing')
@Controller('indexing')
export class IndexingController {
  private readonly logger = new Logger(IndexingController.name);

  constructor(private readonly indexingService: IndexingService) {}

  /**
   * 모든 상품 데이터 인덱싱
   */
  @Post('products')
  @ApiOperation({ summary: '상품 인덱싱', description: '모든 상품 데이터를 벡터화하여 OpenSearch에 인덱싱합니다.' })
  @ApiResponse({ status: 200, description: '인덱싱 완료' })
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
  @ApiOperation({ summary: '상품 재인덱싱', description: '특정 상품을 재인덱싱합니다.' })
  @ApiResponse({ status: 200, description: '재인덱싱 완료' })
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

  /**
   * Few-shot 예제 목록 조회 (페이징)
   */
  @Get('examples')
  @ApiOperation({
    summary: 'Few-shot 예제 목록 조회',
    description: '저장된 Few-shot 예제를 페이징하여 조회합니다.',
  })
  @ApiQuery({ name: 'page', description: '페이지 번호 (1부터 시작)', required: false, example: '1' })
  @ApiQuery({ name: 'limit', description: '페이지당 항목 수', required: false, example: '10' })
  @ApiResponse({ status: 200, description: '조회 성공', type: ExampleListResponseDto })
  async getExamples(@Query('page') page?: string, @Query('limit') limit?: string): Promise<ExampleListResponseDto> {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 10;

    this.logger.log(`Received request to get examples (page: ${pageNum}, limit: ${limitNum})`);

    try {
      const result = await this.indexingService.getAllExamples(pageNum, limitNum);

      return result;
    } catch (error) {
      this.logger.error('Failed to get examples', error);
      throw error;
    }
  }

  /**
   * Few-shot 예제 임베딩
   */
  @Post('examples')
  @ApiOperation({
    summary: 'Few-shot 예제 임베딩',
    description: 'Text-to-SQL을 위한 Few-shot 예제를 임베딩하여 저장합니다.',
  })
  @ApiResponse({ status: 200, description: '예제 임베딩 완료', type: EmbedExampleResponseDto })
  async embedExample(@Body() dto: EmbedExampleRequestDto): Promise<EmbedExampleResponseDto> {
    this.logger.log(`Embedding few-shot example: ${dto.description.substring(0, 50)}...`);

    try {
      const result = await this.indexingService.embedExample(dto);

      return result;
    } catch (error) {
      this.logger.error(`Failed to embed example: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Few-shot 예제 수정
   */
  @Put('examples/:id')
  @ApiOperation({
    summary: '예제 수정',
    description: 'Few-shot 예제를 수정합니다. description이 변경된 경우에만 재임베딩합니다.',
  })
  @ApiResponse({ status: 200, description: '수정 완료', type: UpdateExampleResponseDto })
  async updateExample(
    @Param('id') id: string,
    @Body() dto: UpdateExampleRequestDto,
  ): Promise<UpdateExampleResponseDto> {
    this.logger.log(`Updating example: ${id}`);

    try {
      const result = await this.indexingService.updateExample(id, dto);

      return result;
    } catch (error) {
      this.logger.error(`Failed to update example: ${id}`, error);
      throw error;
    }
  }

  /**
   * 특정 예제 삭제
   */
  @Delete('examples/:id')
  @ApiOperation({
    summary: '예제 삭제',
    description: '특정 Few-shot 예제를 삭제합니다.',
  })
  @ApiResponse({ status: 200, description: '삭제 완료' })
  async deleteExample(@Param('id') id: string) {
    this.logger.log(`Received request to delete example: ${id}`);

    try {
      await this.indexingService.deleteExample(id);

      return {
        success: true,
        message: '예제가 삭제되었습니다.',
        id,
      };
    } catch (error) {
      this.logger.error(`Failed to delete example: ${id}`, error);
      throw error;
    }
  }

  /**
   * 모든 예제 삭제
   */
  @Delete('examples')
  @ApiOperation({
    summary: '전체 예제 삭제',
    description: '모든 Few-shot 예제를 삭제합니다.',
  })
  @ApiResponse({ status: 200, description: '삭제 완료', type: DeleteEmbeddingsResponseDto })
  async deleteAllExamples(): Promise<DeleteEmbeddingsResponseDto> {
    this.logger.log('Received request to delete all examples');

    try {
      const result = await this.indexingService.deleteAllExamples();

      return {
        success: result.deleted,
        message: result.message,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to delete all examples', error);
      throw error;
    }
  }
}
