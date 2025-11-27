import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';

import { QueryRequestDto } from '@/modules/query/dto/query-request.dto';
import { QueryResponseDto } from '@/modules/query/dto/query-response.dto';
import { QueryMapper } from '@/modules/query/query.mapper';
import { QueryService } from '@/modules/query/query.service';

@Controller('query')
export class QueryController {
  private readonly logger = new Logger(QueryController.name);

  constructor(
    private readonly queryService: QueryService,
    private readonly queryMapper: QueryMapper,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
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
