import axios from 'axios';

// API Base URL (Vite 환경 변수)
// 개발 환경: Vite Dev Server(5173)에서 프록시를 통해 백엔드(3000)로 요청
// 프로덕션 환경: 빌드된 정적 파일이 NestJS(3000)에서 서빙되므로 같은 포트 사용
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 10분 (Multi-Agent 복잡한 분석에 시간이 걸릴 수 있음)
  headers: {
    'Content-Type': 'application/json',
  },
});

// API 엔드포인트
export const API_ENDPOINTS = {
  agentQuery: '/query',
  multiAgentQuery: '/multi-agent/query',
  semanticSearch: '/search/semantic',
  hybridSearch: '/search/hybrid',
  examples: '/indexing/examples',
  indexProducts: '/indexing/products',
  health: '/health',
  exportExcel: '/export/excel',
  exportMultiSheetExcel: '/export/excel/multi-sheet',
  exportPdf: '/export/pdf',
  checkExportable: '/export/excel/check',
  // Query Learning
  queryLearningLearn: '/api/query-learning/learn',
  queryLearningFailed: '/api/query-learning/failed',
  queryLearningSetup: '/api/query-learning/setup',
} as const;

// ============================================
// Multi-Agent 시스템 타입 정의
// ============================================

export type InsightType =
  | 'summary'
  | 'trend'
  | 'comparison'
  | 'anomaly'
  | 'ranking'
  | 'distribution'
  | 'correlation'
  | 'prediction'
  | 'recommendation'
  | 'warning'
  | 'opportunity'
  | 'benchmark';

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
  /** 쿼리 라벨 (다중 쿼리 시 시트명으로 사용) */
  label?: string;
  /** 쿼리 설명 */
  description?: string;
}

/**
 * 다중 SQL 데이터셋 (여러 쿼리 결과)
 */
export interface MultiSqlDataSection {
  /** 메인 쿼리 결과 (기본 표시용) */
  primary: SqlDataSection;
  /** 추가 쿼리 결과들 (비교, 추세, 분포 등) */
  additional?: SqlDataSection[];
  /** 전체 쿼리 수 */
  totalQueries: number;
}

export interface SearchResultItem {
  id: string;
  name: string;
  description?: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface SearchDataSection {
  type: 'semantic' | 'hybrid' | 'keyword';
  results: SearchResultItem[];
  totalCount: number;
}

export interface DataSection {
  sql?: SqlDataSection;
  /** 다중 SQL 쿼리 결과 (여러 쿼리 실행 시) */
  multiSql?: MultiSqlDataSection;
  search?: SearchDataSection;
  aggregations?: Record<string, number | string>;
}

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

export type WorkflowStepDetailType = 'query' | 'result' | 'insight' | 'chart' | 'decision' | 'question';

export interface WorkflowStepDetail {
  type: WorkflowStepDetailType;
  label: string;
  value: string;
}

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

export interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  executionTime: number;
  rowCount: number;
  success: boolean;
  error?: string;
  /** 쿼리 라벨 (ex: "상품별 매출") */
  label?: string;
  /** 쿼리 설명 (ex: "상품별 총 매출을 조회합니다") */
  description?: string;
  /** 결과 설명 */
  explanation?: string;
  /** RAG를 통해 검색된 few-shot SQL 예제들 */
  fewShotExamples?: FewShotExample[];
}

export interface WorkflowSection {
  steps: WorkflowStep[];
  totalDuration: number;
  queryHistory: QueryHistoryItem[];
}

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

export interface ErrorSection {
  code: string;
  message: string;
  details?: string;
  suggestion?: string;
}

// ============================================
// 공통 질의 명확화 타입 (Clarification)
// AI 질의와 Multi-Agent에서 공통으로 사용
// ============================================

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

export interface ClarificationQuestion {
  type: ClarificationType;
  question: string;
  options: string[];
  default: string;
}

export interface ClarificationSection {
  needsClarification: boolean;
  reason?: string;
  questions?: ClarificationQuestion[];
}

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

// API 응답 타입
export interface QueryResult {
  [key: string]: string | number | boolean | null;
}

/**
 * Phase 7 Enhanced Query Response
 * LLM이 자동으로 시각화를 결정하고 풍부한 인사이트를 제공합니다
 */
export interface AgentQueryResponse {
  query: string;
  sql: string;
  results: QueryResult[];
  executionTime: number;
  rowCount: number;
  timestamp: string;

  // Phase 7: 시각화 추천
  visualization: {
    type: 'chart' | 'table' | 'both';
    chartType?: 'bar' | 'line' | 'pie';
    reason: string;
  };

  // Phase 7: AI 인사이트
  insights: {
    summary: string;
    keyFindings: string[];
    comparison?: string;
    trend?: string;
    anomaly?: string;
    recommendation?: string;
  };

  // Phase 7: 추가 질문 (선택적) - 공통 타입 사용
  clarifyingQuestions?: ClarificationSection;
}

export interface SearchResultItem {
  id: string;
  name: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface SemanticSearchResponse {
  query: string;
  results: SearchResultItem[];
  searchType: 'semantic' | 'hybrid';
  timestamp: string;
}

export interface DeleteEmbeddingsResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

export interface IndexProductsResponse {
  message: string;
  indexed: number;
  failed: number;
  total: number;
}

// Few-shot 예제 타입
export interface FewShotExample {
  description: string;
  sql: string;
  score?: number;
}

// ============================================
// Query Learning 타입 정의
// ============================================

export interface QueryLearningRequest {
  originalQuery: string;
  failedSql: string;
  errorMessage: string;
  userQuestion: string;
}

export interface QueryLearningResponse {
  success: boolean;
  message: string;
  correctedSql?: string;
  description?: string;
  attempts: number;
  embedded?: boolean; // RAG 임베딩 여부
  failedQueryId?: string; // 실패 시 저장된 ID
}

export interface FailedQueryItem {
  id: string;
  originalQuery: string;
  failedSql: string;
  errorMessage: string;
  userQuestion: string;
  attempts: Array<{
    sql: string;
    error: string;
    timestamp: string;
  }>;
  status: 'pending' | 'resolved' | 'ignored';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedSql?: string;
}

export interface FailedQueriesResponse {
  data: FailedQueryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DuplicateCheckResponse {
  exists: boolean;
  similarQueries?: Array<{
    description: string;
    sql: string;
    score: number;
  }>;
}

export interface ExampleItem {
  id: string;
  description: string;
  sql: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExampleListResponse {
  examples: ExampleItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EmbedExampleResponse {
  id: string;
  description: string;
  sql: string;
  processingTime: number;
}

export interface UpdateExampleResponse {
  id: string;
  description: string;
  sql: string;
  reembedded: boolean;
  processingTime: number;
}

// API 호출 함수
export const api = {
  // AI 질의 실행 (기존 단일 에이전트)
  async queryAgent(query: string): Promise<AgentQueryResponse> {
    const response = await apiClient.post<AgentQueryResponse>(API_ENDPOINTS.agentQuery, { query });
    return response.data;
  },

  // Multi-Agent 질의 실행
  async queryMultiAgent(query: string, skipClarification = false): Promise<MultiAgentResponse> {
    const response = await apiClient.post<MultiAgentResponse>(API_ENDPOINTS.multiAgentQuery, {
      query,
      skipClarification,
    });
    return response.data;
  },

  // 시맨틱 검색
  async semanticSearch(query: string, topK: number = 10): Promise<SemanticSearchResponse> {
    const response = await apiClient.get<SemanticSearchResponse>(API_ENDPOINTS.semanticSearch, {
      params: { query, top_k: topK },
    });
    return response.data;
  },

  // 하이브리드 검색
  async hybridSearch(query: string, topK: number = 10): Promise<SemanticSearchResponse> {
    const response = await apiClient.get<SemanticSearchResponse>(API_ENDPOINTS.hybridSearch, {
      params: { query, top_k: topK },
    });
    return response.data;
  },

  // Health 체크
  async checkHealth(): Promise<{ status: string }> {
    const response = await apiClient.get(API_ENDPOINTS.health);
    return response.data;
  },

  // Few-shot 예제 목록 조회 (페이징)
  async getExamples(page: number = 1, limit: number = 10): Promise<ExampleListResponse> {
    const response = await apiClient.get<ExampleListResponse>(API_ENDPOINTS.examples, {
      params: { page, limit },
    });
    return response.data;
  },

  // Few-shot 예제 임베딩
  async embedExample(example: FewShotExample): Promise<EmbedExampleResponse> {
    const response = await apiClient.post<EmbedExampleResponse>(API_ENDPOINTS.examples, example);
    return response.data;
  },

  // Few-shot 예제 수정
  async updateExample(id: string, example: FewShotExample): Promise<UpdateExampleResponse> {
    const response = await apiClient.put<UpdateExampleResponse>(`${API_ENDPOINTS.examples}/${id}`, example);
    return response.data;
  },

  // 특정 예제 삭제
  async deleteExample(id: string): Promise<{ success: boolean; message: string; id: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string; id: string }>(
      `${API_ENDPOINTS.examples}/${id}`,
    );
    return response.data;
  },

  // 모든 예제 삭제
  async deleteAllExamples(): Promise<DeleteEmbeddingsResponse> {
    const response = await apiClient.delete<DeleteEmbeddingsResponse>(API_ENDPOINTS.examples);
    return response.data;
  },

  // 상품 인덱싱
  async indexProducts(): Promise<IndexProductsResponse> {
    const response = await apiClient.post<IndexProductsResponse>(API_ENDPOINTS.indexProducts);
    return response.data;
  },

  // 엑셀 변환 가능 여부 확인
  async checkExportable(
    columns: ColumnDefinition[],
    rows: Record<string, unknown>[],
  ): Promise<{ exportable: boolean; reason?: string; rowCount?: number; columnCount?: number }> {
    const response = await apiClient.post<{
      exportable: boolean;
      reason?: string;
      rowCount?: number;
      columnCount?: number;
    }>(API_ENDPOINTS.checkExportable, { columns, rows });
    return response.data;
  },

  // 엑셀 파일 다운로드
  async exportToExcel(
    title: string,
    columns: ColumnDefinition[],
    rows: Record<string, unknown>[],
    query?: string,
  ): Promise<void> {
    const response = await apiClient.post(
      API_ENDPOINTS.exportExcel,
      { title, columns, rows, query },
      { responseType: 'blob' },
    );

    // Blob URL 생성하여 다운로드
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Content-Disposition 헤더에서 파일명 추출 시도
    const contentDisposition = response.headers['content-disposition'];
    let filename = `${title}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1]);
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // 다중 시트 엑셀 파일 다운로드
  async exportToMultiSheetExcel(
    title: string,
    sheets: Array<{
      sheetName: string;
      columns: ColumnDefinition[];
      rows: Record<string, unknown>[];
      query?: string;
      description?: string;
    }>,
    insightSummary?: string,
  ): Promise<void> {
    const response = await apiClient.post(
      API_ENDPOINTS.exportMultiSheetExcel,
      { title, sheets, insightSummary },
      { responseType: 'blob' },
    );

    // Blob URL 생성하여 다운로드
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Content-Disposition 헤더에서 파일명 추출 시도
    const contentDisposition = response.headers['content-disposition'];
    let filename = `${title}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1]);
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // PDF 파일 다운로드
  async exportToPdf(
    title: string,
    insightSummary: string,
    insightItems?: Array<{
      type: string;
      title: string;
      content: string;
      importance: string;
    }>,
    dataTable?: {
      columns: ColumnDefinition[];
      rows: Record<string, unknown>[];
    },
    query?: string,
  ): Promise<void> {
    const response = await apiClient.post(
      API_ENDPOINTS.exportPdf,
      { title, insightSummary, insightItems, dataTable, query },
      { responseType: 'blob' },
    );

    // Blob URL 생성하여 다운로드
    const blob = new Blob([response.data], {
      type: 'application/pdf',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Content-Disposition 헤더에서 파일명 추출 시도
    const contentDisposition = response.headers['content-disposition'];
    let filename = `${title}_${new Date().toISOString().slice(0, 10)}.pdf`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1]);
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // ============================================
  // Query Learning API
  // ============================================

  // 실패 쿼리 학습 요청
  async learnFailedQuery(request: QueryLearningRequest): Promise<QueryLearningResponse> {
    const response = await apiClient.post<QueryLearningResponse>(API_ENDPOINTS.queryLearningLearn, request);
    return response.data;
  },

  // 중복 쿼리 임베딩 확인
  async checkDuplicateEmbedding(sql: string): Promise<DuplicateCheckResponse> {
    const response = await apiClient.post<DuplicateCheckResponse>('/api/query-learning/check-duplicate', { sql });
    return response.data;
  },

  // 실패 쿼리 목록 조회
  async getFailedQueries(
    page: number = 1,
    limit: number = 20,
    status?: 'pending' | 'resolved' | 'ignored',
  ): Promise<FailedQueriesResponse> {
    const response = await apiClient.get<FailedQueriesResponse>(API_ENDPOINTS.queryLearningFailed, {
      params: { page, limit, status },
    });
    return response.data;
  },

  // 특정 실패 쿼리 조회
  async getFailedQuery(id: string): Promise<FailedQueryItem> {
    const response = await apiClient.get<FailedQueryItem>(`${API_ENDPOINTS.queryLearningFailed}/${id}`);
    return response.data;
  },

  // 실패 쿼리 해결 처리
  async resolveFailedQuery(
    id: string,
    resolvedSql: string,
    description: string,
    embedToRag: boolean = true,
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.queryLearningFailed}/${id}/resolve`,
      { resolvedSql, description, embedToRag },
    );
    return response.data;
  },

  // 실패 쿼리 무시 처리
  async ignoreFailedQuery(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.queryLearningFailed}/${id}/ignore`,
    );
    return response.data;
  },

  // 실패 쿼리 삭제
  async deleteFailedQuery(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.queryLearningFailed}/${id}`,
    );
    return response.data;
  },

  // Query Learning 인덱스 초기화
  async setupQueryLearning(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(API_ENDPOINTS.queryLearningSetup);
    return response.data;
  },
};

// Request Interceptor (요청 전 처리)
apiClient.interceptors.request.use(
  (config) => {
    // JWT 토큰이 있으면 헤더에 추가 (향후 인증 기능 추가 시)
    // const token = localStorage.getItem('auth_token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor (응답 후 처리)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 에러 처리
    if (error.response) {
      // 서버 응답 에러
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // 네트워크 에러
      console.error('Network Error:', error.message);
    } else {
      // 기타 에러
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  },
);
