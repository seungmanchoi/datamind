import { IsOptional, IsString } from 'class-validator';

/**
 * 쿼리 학습 요청 DTO
 */
export class QueryLearningRequestDto {
  @IsString()
  originalQuery: string; // 원본 사용자 질문

  @IsString()
  failedSql: string; // 실패한 SQL

  @IsString()
  errorMessage: string; // 에러 메시지

  @IsOptional()
  @IsString()
  errorCode?: string; // SQL 에러 코드

  @IsOptional()
  @IsString()
  userQuestion?: string; // 사용자 질문 (originalQuery와 동일, 프론트엔드 호환용)

  @IsOptional()
  context?: {
    tables?: string[];
    queryHistory?: string[];
  };
}
