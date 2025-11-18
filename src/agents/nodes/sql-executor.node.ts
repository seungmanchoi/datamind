import { RunnableConfig } from '@langchain/core/runnables';

import { AgentStateType, setQueryResult } from '../state';
import { SqlExecutorTool } from '../tools';

/**
 * SQL Executor Node
 * 생성된 SQL 쿼리를 실행하고 결과를 State에 저장
 */
export async function sqlExecutorNode(
  state: AgentStateType,
  config?: RunnableConfig,
): Promise<Partial<AgentStateType>> {
  const { sqlQuery } = state;

  // SQL 쿼리가 없으면 에러
  if (!sqlQuery) {
    return {
      error: 'No SQL query to execute',
    };
  }

  // Tool을 config에서 가져옴
  const sqlExecutor = config?.configurable?.sqlExecutor as SqlExecutorTool;

  try {
    // SQL 실행
    const resultJson = await sqlExecutor.invoke(sqlQuery);

    // JSON 파싱
    const result = JSON.parse(resultJson);

    // 에러 체크
    if (result.error) {
      return {
        error: result.message || 'SQL execution failed',
      };
    }

    // 결과가 배열이 아니면 에러
    if (!Array.isArray(result)) {
      return {
        error: 'SQL execution result is not an array',
      };
    }

    // State 업데이트
    return setQueryResult(state, result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      error: `Failed to execute SQL query: ${errorMessage}`,
    };
  }
}
