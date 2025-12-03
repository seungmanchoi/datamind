import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { QueryRequestDto } from '@/modules/query/dto/query-request.dto';
import { QueryResponseDto } from '@/modules/query/dto/query-response.dto';
import { QueryMapper } from '@/modules/query/query.mapper';
import { QueryService } from '@/modules/query/query.service';

@ApiTags('Query')
@Controller('query')
export class QueryController {
  private readonly logger = new Logger(QueryController.name);

  constructor(
    private readonly queryService: QueryService,
    private readonly queryMapper: QueryMapper,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'AI 자연어 질의',
    description: '자연어로 데이터베이스를 질의하고 결과와 인사이트를 반환합니다.',
  })
  @ApiResponse({ status: 200, description: '질의 성공', type: QueryResponseDto })
  async query(@Body() dto: QueryRequestDto): Promise<QueryResponseDto> {
    this.logger.log(`Received query request: ${dto.query}`);

    try {
      const result = await this.queryService.queryFromNaturalLanguage(dto.query);
      const response = this.queryMapper.toDto(result);

      this.logger.log(`Query executed successfully. Returned ${response.rowCount} rows in ${response.executionTime}ms`);

      return response;
    } catch (error) {
      this.logger.error('Failed to execute query', error);
      throw error;
    }
  }
}
