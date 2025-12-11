import { ClarificationSection } from '@/dto/common';

/**
 * Multi-Agent 시스템 응답 프로토콜 정의
 * 프론트엔드와의 통합 스키마
 */

// 공통 Clarification 타입 re-export
export { ClarificationSection, ClarificationQuestion, ClarificationType } from '@/dto/common';

// ============================================
// 인사이트 관련 타입
// ============================================

export type InsightType =
  | 'summary' // 핵심 요약
  | 'trend' // 트렌드 분석
  | 'comparison' // 비교 분석
  | 'anomaly' // 이상치 발견
  | 'ranking' // 순위 분석
  | 'distribution' // 분포 분석
  | 'correlation' // 상관관계
  | 'prediction' // 예측
  | 'recommendation' // 추천/제안
  | 'warning' // 주의/경고
  | 'opportunity' // 기회 발견
  | 'benchmark'; // 벤치마크 비교

export interface InsightItem {
  id: string;
  type: InsightType;
  icon: string;
  title: string;
  content: string;
  importance: 'high' | 'medium' | 'low';
  confidence: number;
  actionable: boolean;
  supportingData?: Record<string, unknown>;
  trend?: 'up' | 'down' | 'stable';
  changePercent?: number;
  comparedTo?: string;
}

export interface InsightSection {
  summary: string;
  items: InsightItem[];
  overallConfidence: number;
}

// ============================================
// 차트/시각화 관련 타입
// ============================================

export type ChartType =
  | 'bar'
  | 'horizontal_bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'heatmap'
  | 'treemap'
  | 'funnel'
  | 'gauge'
  | 'table'
  | 'metric_card'
  | 'comparison'
  | 'sparkline';

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
}

export interface ChartData {
  labels?: string[];
  datasets: ChartDataset[];
}

export interface ChartInteractions {
  clickable: boolean;
  hoverable: boolean;
  zoomable: boolean;
  downloadable: boolean;
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  subtitle?: string;
  data: ChartData;
  options: Record<string, unknown>;
  interactions?: ChartInteractions;
}

export interface ExtraVisualization {
  type: 'metric_card' | 'comparison_card' | 'sparkline' | 'progress';
  data: Record<string, unknown>;
}

export interface VisualizationSection {
  recommended: boolean;
  reason?: string;
  primary?: ChartConfig;
  alternatives?: ChartConfig[];
  extras?: ExtraVisualization[];
}

// ============================================
// 데이터 관련 타입
// ============================================

export interface ColumnDefinition {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage';
  label: string;
  format?: string;
  sortable?: boolean;
  width?: number;
}

export interface SqlDataSection {
  query: string;
  explanation: string;
  columns: ColumnDefinition[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
}

export interface SearchResult {
  id: string;
  name: string;
  description?: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface SearchDataSection {
  type: 'semantic' | 'hybrid' | 'keyword';
  results: SearchResult[];
  totalCount: number;
}

export interface DataSection {
  sql?: SqlDataSection;
  search?: SearchDataSection;
  aggregations?: Record<string, number | string>;
}

// ============================================
// 후속 질문 관련 타입
// ============================================

export interface FollowUpQuestion {
  id: string;
  text: string;
  category: 'deep_dive' | 'comparison' | 'expansion' | 'action';
  icon: string;
  autoQuery?: string;
}

export interface FollowUpSection {
  enabled: boolean;
  questions: FollowUpQuestion[];
}

// ============================================
// 워크플로우 추적 타입
// ============================================

export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'error';

export interface WorkflowStep {
  id: string;
  agent: string;
  agentDisplayName: string;
  status: WorkflowStepStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  input?: string;
  output?: string;
  error?: string;
  // 에이전트가 수행한 작업에 대한 한줄 요약
  summary?: string;
  // 상세 작업 내용
  details?: WorkflowStepDetail[];
}

export interface WorkflowStepDetail {
  type: 'query' | 'result' | 'insight' | 'chart' | 'decision' | 'question';
  label: string;
  value: string;
}

/**
 * RAG에서 검색된 Few-shot SQL 예제
 */
export interface FewShotExample {
  description: string;
  sql: string;
  score: number;
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  executionTime: number;
  rowCount: number;
  success: boolean;
  error?: string;
  /** RAG를 통해 검색된 few-shot SQL 예제들 */
  fewShotExamples?: FewShotExample[];
}

export interface WorkflowSection {
  steps: WorkflowStep[];
  totalDuration: number;
  queryHistory: QueryHistoryItem[];
}

// ============================================
// 메타 정보 타입
// ============================================

export type ResponseType =
  | 'data_only'
  | 'data_with_insight'
  | 'full_analysis'
  | 'search_result'
  | 'comparison'
  | 'error';

export interface ResponseMeta {
  requestId: string;
  query: string;
  timestamp: string;
  processingTime: number;
  agentsUsed: string[];
  confidence: number;
  responseType: ResponseType;
}

// ============================================
// 에러 타입
// ============================================

export interface ErrorSection {
  code: string;
  message: string;
  details?: string;
  suggestion?: string;
}

// ============================================
// 통합 응답 타입
// ============================================

export interface MultiAgentResponse {
  meta: ResponseMeta;
  clarification?: ClarificationSection;
  data?: DataSection;
  insights?: InsightSection;
  visualizations?: VisualizationSection;
  followUp?: FollowUpSection;
  workflow?: WorkflowSection;
  error?: ErrorSection;
}

// ============================================
// 헬퍼 함수
// ============================================

export function createEmptyResponse(query: string, requestId: string): MultiAgentResponse {
  return {
    meta: {
      requestId,
      query,
      timestamp: new Date().toISOString(),
      processingTime: 0,
      agentsUsed: [],
      confidence: 0,
      responseType: 'error',
    },
  };
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
