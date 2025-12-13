/**
 * 실패 쿼리 인터페이스
 */
export interface FailedQueryAttempt {
  attemptNumber: number;
  correctedSql: string;
  errorMessage: string;
  timestamp: Date;
}

export interface FailedQuery {
  id: string;
  originalQuery: string; // 원본 사용자 질문
  failedSql: string; // 최초 실패한 SQL
  errorMessage: string; // 최초 에러 메시지
  errorCode?: string;
  attempts: FailedQueryAttempt[];
  status: 'pending' | 'resolved' | 'ignored';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string; // 해결한 관리자
  resolvedSql?: string; // 최종 해결된 SQL
  notes?: string; // 관리자 메모
}

export interface QueryCorrectionInput {
  originalQuery: string;
  failedSql: string;
  errorMessage: string;
  errorCode?: string;
  context?: {
    tables?: string[];
    queryHistory?: string[];
  };
}

export interface QueryCorrectionResult {
  success: boolean;
  correctedSql?: string;
  description?: string;
  attempts: number;
  embedded?: boolean;
  failedQueryId?: string;
  message: string;
}

export interface QueryValidationResult {
  success: boolean;
  rowCount?: number;
  columns?: string[];
  error?: string;
  errorCode?: string;
}
