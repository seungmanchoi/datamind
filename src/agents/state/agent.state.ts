import { BaseMessage } from '@langchain/core/messages';
import { Annotation } from '@langchain/langgraph';

/**
 * Agent 워크플로우 전체에서 공유되는 State 정의
 * LangGraph가 각 노드(Agent) 간 데이터 흐름을 관리
 */
export const AgentState = Annotation.Root({
  /**
   * 사용자의 자연어 질의
   * 예: "지난 달 매출 상위 10개 상품을 보여줘"
   */
  input: Annotation<string>,

  /**
   * 대화 메시지 히스토리
   * LangChain의 표준 메시지 형식
   */
  messages: Annotation<BaseMessage[]>({
    reducer: (current: BaseMessage[], update: BaseMessage[]) => {
      return current.concat(update);
    },
    default: () => [],
  }),

  /**
   * Text-to-SQL Agent가 생성한 SQL 쿼리
   * 예: "SELECT product_name, SUM(sales) FROM ... ORDER BY sales DESC LIMIT 10"
   */
  sqlQuery: Annotation<string | null>({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  /**
   * SQL 실행 결과 (JSON 형식)
   * SqlExecutorTool이 반환한 데이터
   */
  queryResult: Annotation<Record<string, unknown>[] | null>({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  /**
   * Insight Summarizer Agent가 생성한 요약
   * 자연어로 데이터 인사이트 설명
   */
  summary: Annotation<string | null>({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  /**
   * 에러 메시지 (에러 발생 시)
   */
  error: Annotation<string | null>({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  /**
   * 쿼리 타입 (SQL vs Semantic Search)
   * Router Agent가 결정
   */
  queryType: Annotation<'sql' | 'semantic' | null>({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  /**
   * Semantic Search 결과
   * SemanticSearchTool이 반환한 데이터
   */
  semanticResults: Annotation<Record<string, unknown>[] | null>({
    reducer: (current, update) => update ?? current,
    default: () => null,
  }),

  /**
   * 추가 메타데이터
   * 실행 시간, 쿼리 타입, 사용된 테이블 등
   */
  metadata: Annotation<Record<string, unknown>>({
    reducer: (current: Record<string, unknown>, update: Record<string, unknown>) => {
      return { ...current, ...update };
    },
    default: () => ({}),
  }),
});

/**
 * AgentState의 TypeScript 타입
 * LangGraph Node 함수에서 사용
 */
export type AgentStateType = typeof AgentState.State;
