import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * 실패 쿼리 시도 DTO
 */
export class FailedQueryAttemptDto {
  attemptNumber: number;
  correctedSql: string;
  errorMessage: string;
  timestamp: Date;
}

/**
 * 실패 쿼리 DTO
 */
export class FailedQueryDto {
  id: string;
  originalQuery: string;
  failedSql: string;
  errorMessage: string;
  errorCode?: string;
  attempts: FailedQueryAttemptDto[];
  status: 'pending' | 'resolved' | 'ignored';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolvedSql?: string;
  notes?: string;
}

/**
 * 실패 쿼리 해결 요청 DTO
 */
export class ResolveFailedQueryDto {
  @IsString()
  resolvedSql: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * 실패 쿼리 목록 조회 필터 DTO
 */
export class FailedQueryFilterDto {
  @IsOptional()
  @IsEnum(['pending', 'resolved', 'ignored', 'all'])
  status?: 'pending' | 'resolved' | 'ignored' | 'all';

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

/**
 * 페이지네이션 응답
 */
export class PaginatedFailedQueriesDto {
  data: FailedQueryDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
