import { ChatBedrockConverse } from '@langchain/aws';
import { RunnableConfig } from '@langchain/core/runnables';

import { AgentStateType, setSummary } from '@/agents/state';

/**
 * Insight Summarizer Node
 * SQL 실행 결과를 자연어로 요약하고 인사이트 제공
 */
export async function insightSummarizerNode(
  state: AgentStateType,
  config?: RunnableConfig,
): Promise<Partial<AgentStateType>> {
  const { input, queryType, sqlQuery, queryResult, semanticResults } = state;

  // SQL 또는 Semantic Search 결과가 있는지 확인
  if (!queryResult && !semanticResults) {
    return {
      error: 'No query result to summarize',
    };
  }

  // LLM을 config에서 가져옴
  const chatModel = config?.configurable?.chatModel as ChatBedrockConverse;

  try {
    // 인사이트 생성 프롬프트 (SQL 또는 Semantic Search)
    let prompt: string;
    if (queryType === 'semantic' && semanticResults) {
      prompt = buildSemanticInsightPrompt(input, semanticResults);
    } else if (sqlQuery && queryResult) {
      prompt = buildInsightPrompt(input, sqlQuery, queryResult);
    } else {
      return {
        error: 'Invalid state: no valid results to summarize',
      };
    }

    // LLM을 통해 인사이트 생성
    const response = await chatModel.invoke(prompt);
    const summary = response.content as string;

    // State 업데이트
    return setSummary(state, summary);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      error: `Failed to generate insight summary: ${errorMessage}`,
    };
  }
}

/**
 * 인사이트 생성 프롬프트
 */
function buildInsightPrompt(userQuery: string, sqlQuery: string, queryResult: Record<string, unknown>[]): string {
  // 결과 데이터를 포맷팅
  const resultSummary = formatQueryResult(queryResult);

  return `You are a data analyst providing insights from database query results.

Original User Question:
"${userQuery}"

SQL Query Executed:
${sqlQuery}

Query Results:
${resultSummary}

Instructions:
1. Analyze the query results carefully
2. Provide a clear, concise summary in natural language (Korean)
3. Highlight key insights, trends, or patterns
4. Include specific numbers and facts from the results
5. If there are notable findings (anomalies, top performers, etc.), mention them
6. Keep the response conversational and easy to understand
7. Format the response in a structured way if there are multiple insights

Generate the insight summary:`;
}

/**
 * Semantic Search 인사이트 프롬프트
 */
function buildSemanticInsightPrompt(userQuery: string, semanticResults: Record<string, unknown>[]): string {
  const resultSummary = formatQueryResult(semanticResults);

  return `You are a data analyst providing insights from semantic search results.

Original User Question:
"${userQuery}"

Semantic Search Method: Vector similarity search using embeddings

Search Results:
${resultSummary}

Instructions:
1. Analyze the semantic search results carefully
2. Provide a clear, concise summary in natural language (Korean)
3. Explain why these products are similar or relevant to the query
4. Highlight common features or characteristics among the results
5. Mention similarity scores if they are significantly different
6. Keep the response conversational and easy to understand
7. Suggest which products might be most relevant

Generate the insight summary:`;
}

/**
 * 쿼리 결과 포맷팅
 */
function formatQueryResult(queryResult: Record<string, unknown>[]): string {
  if (queryResult.length === 0) {
    return 'No results found.';
  }

  // 최대 10개까지만 표시
  const limitedResult = queryResult.slice(0, 10);

  // JSON 형식으로 변환
  const formatted = JSON.stringify(limitedResult, null, 2);

  // 총 결과 개수 추가
  const summary = `Total ${queryResult.length} rows returned. Showing first ${limitedResult.length}:\n\n${formatted}`;

  return summary;
}
