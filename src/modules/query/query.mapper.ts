import { Injectable } from '@nestjs/common';

import { QueryResponseDto } from './dto/query-response.dto';
import { QueryResult } from './query.service';

@Injectable()
export class QueryMapper {
  toDto(result: QueryResult): QueryResponseDto {
    return new QueryResponseDto({
      sql: result.sql,
      data: result.data,
      executionTime: result.executionTime,
      rowCount: result.data.length,
      timestamp: new Date().toISOString(),
    });
  }
}
