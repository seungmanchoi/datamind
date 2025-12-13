import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Query } from '@nestjs/common';

import {
  FailedQueryDto,
  PaginatedFailedQueriesDto,
  QueryLearningRequestDto,
  QueryLearningResponseDto,
  ResolveFailedQueryDto,
} from './dto';
import { QueryLearningService } from './query-learning.service';

/**
 * Query Learning Controller
 * 실패 쿼리 학습 및 관리 API
 */
@Controller('api/query-learning')
export class QueryLearningController {
  constructor(private readonly queryLearningService: QueryLearningService) {}

  /**
   * 실패 쿼리 학습 요청
   * POST /api/query-learning/learn
   */
  @Post('learn')
  async learnQuery(@Body() dto: QueryLearningRequestDto): Promise<QueryLearningResponseDto> {
    return this.queryLearningService.learnFailedQuery(dto);
  }

  /**
   * 실패 쿼리 목록 조회
   * GET /api/query-learning/failed
   */
  @Get('failed')
  async getFailedQueries(
    @Query('status') status?: 'pending' | 'resolved' | 'ignored' | 'all',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedFailedQueriesDto> {
    return this.queryLearningService.getFailedQueries({
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * 실패 쿼리 상세 조회
   * GET /api/query-learning/failed/:id
   */
  @Get('failed/:id')
  async getFailedQuery(@Param('id') id: string): Promise<FailedQueryDto> {
    const result = await this.queryLearningService.getFailedQueryById(id);
    if (!result) {
      throw new HttpException('실패 쿼리를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    return result;
  }

  /**
   * 실패 쿼리 수동 해결
   * POST /api/query-learning/failed/:id/resolve
   */
  @Post('failed/:id/resolve')
  async resolveFailedQuery(
    @Param('id') id: string,
    @Body() dto: ResolveFailedQueryDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.queryLearningService.resolveFailedQuery(id, dto);
  }

  /**
   * 실패 쿼리 무시 처리
   * POST /api/query-learning/failed/:id/ignore
   */
  @Post('failed/:id/ignore')
  async ignoreFailedQuery(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.queryLearningService.ignoreFailedQuery(id);
  }

  /**
   * 실패 쿼리 삭제
   * DELETE /api/query-learning/failed/:id
   */
  @Delete('failed/:id')
  async deleteFailedQuery(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.queryLearningService.deleteFailedQuery(id);
  }

  /**
   * 중복 쿼리 임베딩 확인
   * POST /api/query-learning/check-duplicate
   */
  @Post('check-duplicate')
  async checkDuplicate(@Body('sql') sql: string): Promise<{
    exists: boolean;
    similarQueries?: { description: string; sql: string; score: number }[];
  }> {
    if (!sql) {
      throw new HttpException('SQL is required', HttpStatus.BAD_REQUEST);
    }
    return this.queryLearningService.checkDuplicateEmbedding(sql);
  }

  /**
   * 실패 쿼리 인덱스 생성 (초기 설정용)
   * POST /api/query-learning/setup
   */
  @Post('setup')
  async setupIndex(): Promise<{ success: boolean; message: string }> {
    try {
      await this.queryLearningService.createFailedQueriesIndex();
      return { success: true, message: 'failed_queries 인덱스가 생성되었습니다.' };
    } catch (error) {
      return { success: false, message: `인덱스 생성 실패: ${error}` };
    }
  }
}
