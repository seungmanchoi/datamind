/**
 * 쿼리 학습 응답 DTO
 */
export class QueryLearningResponseDto {
  success: boolean;
  correctedSql?: string; // 보정된 SQL
  description?: string; // 생성된 설명
  attempts: number; // 시도 횟수
  embedded?: boolean; // RAG 임베딩 여부
  failedQueryId?: string; // 실패 시 저장된 ID
  message: string;
}
