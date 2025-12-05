import { ChatBedrockConverse } from '@langchain/aws';
import { RunnableConfig } from '@langchain/core/runnables';
import { Logger } from '@nestjs/common';

import { formatFewShotExamples, getRelevantExamples } from '@/agents/config/fewshot-examples';
import { AgentStateType, setSqlQuery } from '@/agents/state';
import { SchemaRetrievalTool } from '@/agents/tools';
import { RagService, SqlExample } from '@/rag/rag.service';

const logger = new Logger('TextToSqlNode');

/**
 * Text-to-SQL Agent Node
 * 사용자의 자연어 질의를 SQL 쿼리로 변환
 */
export async function textToSqlNode(state: AgentStateType, config?: RunnableConfig): Promise<Partial<AgentStateType>> {
  const { input } = state;

  // Tool, LLM, RagService를 config에서 가져옴
  const schemaRetrieval = config?.configurable?.schemaRetrieval as SchemaRetrievalTool;
  const chatModel = config?.configurable?.chatModel as ChatBedrockConverse;
  const ragService = config?.configurable?.ragService as RagService | undefined;

  try {
    // 1. 먼저 데이터베이스 스키마 조회
    const schemaInfo = await schemaRetrieval.invoke('');

    // 2. Text-to-SQL 프롬프트 생성 (RAG 적용)
    const prompt = await buildTextToSqlPrompt(input, schemaInfo, ragService);

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
 * RAG 검색 결과를 상세 로깅
 */
function logRagResults(query: string, examples: SqlExample[], source: 'RAG' | 'Fallback'): void {
  logger.log('═'.repeat(60));
  logger.log(`📊 Few-Shot Hint 검색 결과 (Source: ${source})`);
  logger.log('─'.repeat(60));
  logger.log(`🔍 User Query: "${query}"`);
  logger.log(`📝 검색된 예제 수: ${examples.length}개`);
  logger.log('─'.repeat(60));

  examples.forEach((ex, idx) => {
    logger.log(`\n[Example ${idx + 1}] Score: ${ex.score?.toFixed(4) || 'N/A'}`);
    logger.log(`  📌 Description: ${ex.description}`);
    logger.log(`  💾 SQL: ${ex.sql.substring(0, 100)}${ex.sql.length > 100 ? '...' : ''}`);
  });

  logger.log('═'.repeat(60));
}

/**
 * Text-to-SQL 프롬프트 생성 (RAG + Few-Shot Learning 적용)
 * RAG Service를 사용하여 OpenSearch에서 유사 SQL 예제를 동적으로 검색
 */
async function buildTextToSqlPrompt(userQuery: string, schemaInfo: string, ragService?: RagService): Promise<string> {
  let examplesText: string;

  // RAG Service를 사용할 수 있는 경우 벡터 검색으로 유사 예제 가져오기
  if (ragService) {
    try {
      logger.log(`🚀 RAG 검색 시작: "${userQuery.substring(0, 50)}..."`);
      const ragContext = await ragService.getRagContext(userQuery, 5);

      if (ragContext.examples.length > 0) {
        // RAG 검색 결과 로깅
        logRagResults(userQuery, ragContext.examples, 'RAG');

        // RAG로 검색된 예제를 Few-Shot 형식으로 포맷팅
        examplesText = ragContext.examples
          .map(
            (ex, idx) => `
Example ${idx + 1}:
Description: "${ex.description}"
SQL: ${ex.sql}`,
          )
          .join('\n');
      } else {
        logger.warn('⚠️ RAG 검색 결과 없음 - Fallback 사용');
        // RAG 결과가 없으면 하드코딩된 Few-Shot 예제 사용 (Fallback)
        const relevantExamples = getRelevantExamples(userQuery, 3);
        examplesText =
          relevantExamples.length > 0
            ? relevantExamples
                .map(
                  (ex, idx) => `
Example ${idx + 1}:
Question: "${ex.question}"
SQL: ${ex.sql}`,
                )
                .join('\n')
            : formatFewShotExamples();
      }
    } catch (error) {
      // RAG 실패 시 기존 키워드 매칭 방식 사용 (Fallback)
      logger.error(`❌ RAG Service 오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.warn('⚠️ Fallback: 키워드 매칭 방식 사용');
      const relevantExamples = getRelevantExamples(userQuery, 3);
      examplesText =
        relevantExamples.length > 0
          ? relevantExamples
              .map(
                (ex, idx) => `
Example ${idx + 1}:
Question: "${ex.question}"
SQL: ${ex.sql}`,
              )
              .join('\n')
          : formatFewShotExamples();
    }
  } else {
    logger.warn('⚠️ RAG Service 미설정 - 키워드 매칭 사용');
    // RAG Service가 없으면 기존 키워드 매칭 방식 사용
    const relevantExamples = getRelevantExamples(userQuery, 3);
    examplesText =
      relevantExamples.length > 0
        ? relevantExamples
            .map(
              (ex, idx) => `
Example ${idx + 1}:
Question: "${ex.question}"
SQL: ${ex.sql}`,
            )
            .join('\n')
        : formatFewShotExamples();
  }

  return `You are an expert SQL query generator for a MySQL database (NDMarket E-commerce Platform).

Database Schema:
${schemaInfo}

Here are some example queries to help you understand the database structure and query patterns:
${examplesText}

Now, generate a SQL query for the following request:

User Request:
"${userQuery}"

Instructions:
1. Analyze the user's request carefully and refer to the examples above
2. Identify which tables and columns are needed (주요 테이블: product, market, market_statistics_daily, order_market_product)
3. Generate a valid MySQL SELECT query
4. Return ONLY the SQL query, without any explanation or markdown formatting
5. Use proper JOIN clauses when multiple tables are involved
6. Include appropriate WHERE, ORDER BY, and LIMIT clauses as needed
7. Always add "p.is_deleted = 0" when querying the product table
8. Ensure the query is optimized and follows MySQL best practices
9. Use Korean-friendly column aliases when appropriate (AS 절 사용)

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
