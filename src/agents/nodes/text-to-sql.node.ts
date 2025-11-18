import { BedrockChat } from '@langchain/community/chat_models/bedrock';
import { RunnableConfig } from '@langchain/core/runnables';

import { AgentStateType, setSqlQuery } from '../state';
import { SchemaRetrievalTool } from '../tools';

/**
 * Text-to-SQL Agent Node
 * 사용자의 자연어 질의를 SQL 쿼리로 변환
 */
export async function textToSqlNode(state: AgentStateType, config?: RunnableConfig): Promise<Partial<AgentStateType>> {
  const { input } = state;

  // Tool과 LLM을 config에서 가져옴 (나중에 구현)
  const schemaRetrieval = config?.configurable?.schemaRetrieval as SchemaRetrievalTool;
  const chatModel = config?.configurable?.chatModel as BedrockChat;

  try {
    // 1. 먼저 데이터베이스 스키마 조회
    const schemaInfo = await schemaRetrieval.invoke('');

    // 2. Text-to-SQL 프롬프트 생성
    const prompt = buildTextToSqlPrompt(input, schemaInfo);

    // 3. LLM을 통해 SQL 생성
    const response = await chatModel.invoke(prompt);
    const sqlQuery = extractSqlFromResponse(response.content as string);

    // 4. State 업데이트
    return setSqlQuery(state, sqlQuery);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      error: `Failed to generate SQL query: ${errorMessage}`,
    };
  }
}

/**
 * Text-to-SQL 프롬프트 생성
 */
function buildTextToSqlPrompt(userQuery: string, schemaInfo: string): string {
  return `You are an expert SQL query generator for a MySQL database.

Database Schema:
${schemaInfo}

User Request:
"${userQuery}"

Instructions:
1. Analyze the user's request carefully
2. Identify which tables and columns are needed
3. Generate a valid MySQL SELECT query
4. Return ONLY the SQL query, without any explanation or markdown formatting
5. Use proper JOIN clauses when multiple tables are involved
6. Include appropriate WHERE, ORDER BY, and LIMIT clauses as needed
7. Ensure the query is optimized and follows MySQL best practices

Generate the SQL query:`;
}

/**
 * LLM 응답에서 SQL 쿼리 추출
 * 마크다운 코드 블록이나 불필요한 텍스트 제거
 */
function extractSqlFromResponse(response: string): string {
  // 마크다운 코드 블록 제거
  let sql = response.replace(/```sql\n?/g, '').replace(/```\n?/g, '');

  // 앞뒤 공백 제거
  sql = sql.trim();

  // SELECT로 시작하는지 확인
  if (!sql.toLowerCase().startsWith('select')) {
    throw new Error('Generated SQL does not start with SELECT');
  }

  return sql;
}
