export class QueryResponseDto {
  sql: string;
  data: unknown[];
  executionTime: number;
  rowCount: number;
  timestamp: string;

  constructor(partial: Partial<QueryResponseDto>) {
    Object.assign(this, partial);
  }
}
