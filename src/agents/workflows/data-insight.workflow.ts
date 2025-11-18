import { END, START, StateGraph } from '@langchain/langgraph';

import { insightSummarizerNode, sqlExecutorNode, textToSqlNode } from '../nodes';
import { AgentState } from '../state';

/**
 * Data Insight Workflow
 * Text-to-SQL → SQL Execution → Insight Summarization 순서로 실행되는 워크플로우
 */
export function createDataInsightWorkflow() {
  // StateGraph 생성
  const workflow = new StateGraph(AgentState)
    // Node 추가
    .addNode('textToSql', textToSqlNode)
    .addNode('sqlExecutor', sqlExecutorNode)
    .addNode('insightSummarizer', insightSummarizerNode)

    // Edge 연결: 선형 워크플로우
    .addEdge(START, 'textToSql')
    .addEdge('textToSql', 'sqlExecutor')
    .addEdge('sqlExecutor', 'insightSummarizer')
    .addEdge('insightSummarizer', END);

  // Compiled graph 반환
  return workflow.compile();
}

/**
 * Conditional Edge를 사용하는 고급 워크플로우 (향후 확장용)
 * 에러 처리 및 조건부 분기 포함
 */
export function createAdvancedDataInsightWorkflow() {
  const workflow = new StateGraph(AgentState)
    .addNode('textToSql', textToSqlNode)
    .addNode('sqlExecutor', sqlExecutorNode)
    .addNode('insightSummarizer', insightSummarizerNode)

    // 시작
    .addEdge(START, 'textToSql')

    // Text-to-SQL 이후 조건부 분기
    .addConditionalEdges('textToSql', (state) => {
      // 에러가 있으면 종료
      if (state.error) {
        return END;
      }
      // SQL이 생성되었으면 실행
      return 'sqlExecutor';
    })

    // SQL 실행 이후 조건부 분기
    .addConditionalEdges('sqlExecutor', (state) => {
      // 에러가 있으면 종료
      if (state.error) {
        return END;
      }
      // 결과가 있으면 요약
      return 'insightSummarizer';
    })

    // 요약 이후 종료
    .addEdge('insightSummarizer', END);

  return workflow.compile();
}
