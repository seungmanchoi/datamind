import { AIMessage, HumanMessage } from '@langchain/core/messages';

import { AgentStateType } from './agent.state';

/**
 * State 업데이트 헬퍼 함수들
 * LangGraph Node에서 State를 쉽게 업데이트할 수 있도록 지원
 */

/**
 * 사용자 메시지를 State에 추가
 */
export function addUserMessage(state: AgentStateType, content: string): Partial<AgentStateType> {
  return {
    messages: [new HumanMessage(content)],
  };
}

/**
 * AI 응답 메시지를 State에 추가
 */
export function addAIMessage(state: AgentStateType, content: string): Partial<AgentStateType> {
  return {
    messages: [new AIMessage(content)],
  };
}

/**
 * SQL 쿼리를 State에 설정
 */
export function setSqlQuery(state: AgentStateType, query: string): Partial<AgentStateType> {
  return {
    sqlQuery: query,
    metadata: {
      ...state.metadata,
      sqlGeneratedAt: new Date().toISOString(),
    },
  };
}

/**
 * 쿼리 결과를 State에 설정
 */
export function setQueryResult(state: AgentStateType, result: Record<string, unknown>[]): Partial<AgentStateType> {
  return {
    queryResult: result,
    metadata: {
      ...state.metadata,
      resultCount: result.length,
      queryExecutedAt: new Date().toISOString(),
    },
  };
}

/**
 * 인사이트 요약을 State에 설정
 */
export function setSummary(state: AgentStateType, summary: string): Partial<AgentStateType> {
  return {
    summary,
    metadata: {
      ...state.metadata,
      summaryGeneratedAt: new Date().toISOString(),
    },
  };
}

/**
 * 에러를 State에 설정
 */
export function setError(state: AgentStateType, error: string): Partial<AgentStateType> {
  return {
    error,
    metadata: {
      ...state.metadata,
      errorOccurredAt: new Date().toISOString(),
    },
  };
}

/**
 * State 초기화
 */
export function initializeState(input: string): Partial<AgentStateType> {
  return {
    input,
    messages: [new HumanMessage(input)],
    sqlQuery: null,
    queryResult: null,
    summary: null,
    error: null,
    metadata: {
      startedAt: new Date().toISOString(),
    },
  };
}

/**
 * State가 완료 상태인지 확인
 * summary가 있거나 error가 있으면 완료로 간주
 */
export function isStateComplete(state: AgentStateType): boolean {
  return state.summary !== null || state.error !== null;
}

/**
 * State가 에러 상태인지 확인
 */
export function hasError(state: AgentStateType): boolean {
  return state.error !== null;
}
