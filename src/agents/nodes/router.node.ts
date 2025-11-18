import { RunnableConfig } from '@langchain/core/runnables';

import { AgentStateType } from '../state';

/**
 * Router Node
 * 사용자 질의를 분석하여 SQL vs Semantic Search 결정
 */
export async function routerNode(state: AgentStateType, config?: RunnableConfig): Promise<Partial<AgentStateType>> {
  const { input } = state;

  const query = input.toLowerCase();

  // Semantic Search 키워드 감지
  const semanticKeywords = [
    '같은',
    '유사한',
    '비슷한',
    '추천',
    '찾아줘',
    '어울리는',
    '관련',
    '연관',
    '느낌',
    '스타일',
    '소재',
  ];

  const isSemanticQuery = semanticKeywords.some((keyword) => query.includes(keyword));

  // SQL 키워드 감지
  const sqlKeywords = ['통계', '집계', '분석', '비교', '순위', '개수', '평균', '합계', '최대', '최소', '상위', '하위'];

  const isSqlQuery = sqlKeywords.some((keyword) => query.includes(keyword));

  // 쿼리 타입 결정
  let queryType: 'sql' | 'semantic';

  if (isSemanticQuery && !isSqlQuery) {
    queryType = 'semantic';
  } else if (isSqlQuery && !isSemanticQuery) {
    queryType = 'sql';
  } else {
    // 기본값: SQL
    queryType = 'sql';
  }

  return {
    queryType,
    metadata: {
      ...state.metadata,
      routingDecision: queryType,
      isSemanticQuery,
      isSqlQuery,
    },
  };
}
