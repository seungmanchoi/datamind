/**
 * 공통 Clarification (질의 명확화) 타입 정의
 * AI 질의와 Multi-Agent에서 공통으로 사용
 */

/**
 * 명확화 질문 타입
 * - period: 기간 정보 (예: 오늘, 이번 주, 이번 달)
 * - limit: 결과 개수 (예: 상위 10개, 20개)
 * - filter: 필터 조건 (예: 가격대, 상태)
 * - grouping: 그룹화 단위 (예: 일별, 주별, 월별)
 * - category: 카테고리 선택 (예: 아동복, 의류)
 * - order: 정렬 순서 (예: 오름차순, 내림차순)
 */
export type ClarificationType = 'period' | 'limit' | 'filter' | 'grouping' | 'category' | 'order';

/**
 * 명확화 질문 항목
 */
export interface ClarificationQuestion {
  /** 질문 타입 */
  type: ClarificationType;
  /** 사용자에게 표시할 질문 */
  question: string;
  /** 선택 가능한 옵션들 */
  options: string[];
  /** 기본 선택값 */
  default: string;
}

/**
 * 명확화 섹션 (응답에 포함)
 */
export interface ClarificationSection {
  /** 명확화가 필요한지 여부 */
  needsClarification: boolean;
  /** 명확화가 필요한 이유 */
  reason?: string;
  /** 추가 질문 목록 */
  questions?: ClarificationQuestion[];
}

/**
 * 질의 분석 결과 (BedrockService에서 반환)
 */
export interface QueryAnalysisResult {
  needsClarification: boolean;
  reason?: string;
  questions?: ClarificationQuestion[];
}
