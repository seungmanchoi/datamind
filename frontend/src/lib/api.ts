import axios from 'axios';

// API Base URL (Vite 환경 변수)
// 개발 환경: Vite Dev Server(5173)에서 프록시를 통해 백엔드(3000)로 요청
// 프로덕션 환경: 빌드된 정적 파일이 NestJS(3000)에서 서빙되므로 같은 포트 사용
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API 엔드포인트
export const API_ENDPOINTS = {
  agentQuery: '/query',
  semanticSearch: '/search/semantic',
  hybridSearch: '/search/hybrid',
  health: '/health',
} as const;

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

  // Phase 7: 추가 질문 (선택적)
  clarifyingQuestions?: {
    reason: string;
    questions: Array<{
      type: 'period' | 'limit' | 'filter' | 'grouping';
      question: string;
      options: string[];
      default: string;
    }>;
  };
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

// API 호출 함수
export const api = {
  // AI 질의 실행
  async queryAgent(query: string): Promise<AgentQueryResponse> {
    const response = await apiClient.post<AgentQueryResponse>(
      API_ENDPOINTS.agentQuery,
      { query }
    );
    return response.data;
  },

  // 시맨틱 검색
  async semanticSearch(
    query: string,
    topK: number = 10
  ): Promise<SemanticSearchResponse> {
    const response = await apiClient.get<SemanticSearchResponse>(
      API_ENDPOINTS.semanticSearch,
      {
        params: { query, top_k: topK },
      }
    );
    return response.data;
  },

  // 하이브리드 검색
  async hybridSearch(
    query: string,
    topK: number = 10
  ): Promise<SemanticSearchResponse> {
    const response = await apiClient.get<SemanticSearchResponse>(
      API_ENDPOINTS.hybridSearch,
      {
        params: { query, top_k: topK },
      }
    );
    return response.data;
  },

  // Health 체크
  async checkHealth(): Promise<{ status: string }> {
    const response = await apiClient.get(API_ENDPOINTS.health);
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
  }
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
  }
);
