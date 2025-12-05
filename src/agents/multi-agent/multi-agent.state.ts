import { BaseMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';

import {
  ChartConfig,
  ColumnDefinition,
  ExtraVisualization,
  FollowUpQuestion,
  InsightItem,
  SearchResult,
} from '@/dto/response/multi-agent-response.dto';

/**
 * Multi-Agent 워크플로우 State 정의
 * Supervisor 패턴에서 에이전트 간 공유되는 상태
 */
export const MultiAgentState = Annotation.Root({
  // ============================================
  // 기본 입력/메시지
  // ============================================

  /**
   * 사용자의 원본 질의
   */
  input: Annotation<string>,

  /**
   * 대화 메시지 히스토리
   */
  messages: Annotation<BaseMessage[]>({
    reducer: (current: BaseMessage[], update: BaseMessage[]) => {
      return current.concat(update);
    },
    default: () => [],
  }),

  // ============================================
  // SQL Expert 관련
  // ============================================

  /**
   * 생성된 SQL 쿼리
   */
  sqlQuery: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  /**
   * SQL 쿼리 설명
   */
  sqlExplanation: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  /**
   * SQL 실행 결과 (raw data)
   */
  sqlResults: Annotation<Record<string, unknown>[] | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  /**
   * SQL 결과 컬럼 정의
   */
  sqlColumns: Annotation<ColumnDefinition[] | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  /**
   * SQL 실행 시간 (ms)
   */
  sqlExecutionTime: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  // ============================================
  // Search Expert 관련
  // ============================================

  /**
   * 검색 타입
   */
  searchType: Annotation<'semantic' | 'hybrid' | 'keyword' | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  /**
   * 검색 결과
   */
  searchResults: Annotation<SearchResult[] | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // ============================================
  // Insight Analyst 관련
  // ============================================

  /**
   * 인사이트 요약
   */
  insightSummary: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  /**
   * 인사이트 항목들
   */
  insightItems: Annotation<InsightItem[]>({
    reducer: (current, update) => {
      if (update.length === 0) return current;
      return update;
    },
    default: () => [],
  }),

  /**
   * 인사이트 신뢰도
   */
  insightConfidence: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  // ============================================
  // Chart Advisor 관련
  // ============================================

  /**
   * 차트 추천 여부
   */
  chartRecommended: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false,
  }),

  /**
   * 차트 추천 이유
   */
  chartReason: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  /**
   * 주요 추천 차트
   */
  primaryChart: Annotation<ChartConfig | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  /**
   * 대안 차트들
   */
  alternativeCharts: Annotation<ChartConfig[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  /**
   * 추가 시각화 요소 (KPI 카드 등)
   */
  extraVisualizations: Annotation<ExtraVisualization[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  // ============================================
  // Follow-up Agent 관련
  // ============================================

  /**
   * 후속 질문들
   */
  followUpQuestions: Annotation<FollowUpQuestion[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  // ============================================
  // 메타 정보
  // ============================================

  /**
   * 사용된 에이전트 목록
   */
  agentsUsed: Annotation<string[]>({
    reducer: (current, update) => {
      const newAgents = update.filter((a) => !current.includes(a));
      return [...current, ...newAgents];
    },
    default: () => [],
  }),

  /**
   * 현재 처리 단계
   */
  currentStep: Annotation<string>({
    reducer: (_, update) => update,
    default: () => 'start',
  }),

  /**
   * 에러 메시지
   */
  error: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  /**
   * 전체 처리 시작 시간
   */
  startTime: Annotation<number>({
    reducer: (current, update) => update || current,
    default: () => Date.now(),
  }),
});

/**
 * Multi-Agent State 타입
 */
export type MultiAgentStateType = typeof MultiAgentState.State;

/**
 * 초기 상태 생성
 */
export function initializeMultiAgentState(query: string): Partial<MultiAgentStateType> {
  return {
    input: query,
    messages: [],
    startTime: Date.now(),
    currentStep: 'start',
    agentsUsed: [],
  };
}
