import { ChatBedrockConverse } from '@langchain/aws';
import { StructuredToolInterface, tool } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { DataSource } from 'typeorm';
import { z } from 'zod';

import { RagService } from '@/rag/rag.service';

import { SQL_EXPERT_FEW_SHOT_EXAMPLES, SQL_EXPERT_PROMPT } from './prompts';
import { createSqlTools } from './tools';

export interface SqlExpertAgentOptions {
  model: ChatBedrockConverse;
  dataSource: DataSource;
  ragService?: RagService;
}

/**
 * SQL Expert Agent 생성
 * createReactAgent 기반으로 변경하여 Supervisor와 호환성 확보
 */
export function createSqlExpertAgent(options: SqlExpertAgentOptions) {
  const { model, dataSource, ragService } = options;
  const { executeSQL, getSchema } = createSqlTools(dataSource);

  // 도구 목록 구성 (다양한 스키마를 위해 StructuredToolInterface 타입 사용)
  const tools: StructuredToolInterface[] = [getSchema, executeSQL];

  // RAG 서비스가 있으면 RAG 도구 추가
  if (ragService) {
    const getRagExamples = tool(
      async ({ question }) => {
        try {
          const ragContext = await ragService.getRagContext(question, 3);

          if (ragContext.examples.length === 0) {
            return JSON.stringify({
              found: false,
              message: '유사한 SQL 예제를 찾지 못했습니다.',
            });
          }

          const examples = ragContext.examples.map((ex, idx) => ({
            rank: idx + 1,
            score: ex.score?.toFixed(3) || 'N/A',
            description: ex.description,
            sql: ex.sql,
          }));

          return JSON.stringify({
            found: true,
            count: examples.length,
            examples,
            hint: '위 예제를 참고하여 비슷한 패턴으로 쿼리를 작성하세요.',
          });
        } catch (error) {
          return JSON.stringify({
            found: false,
            error: error instanceof Error ? error.message : 'RAG 검색 실패',
          });
        }
      },
      {
        name: 'get_similar_sql_examples',
        description: '유사한 SQL 쿼리 예제를 검색합니다. 복잡한 쿼리 작성 전에 호출하면 도움이 됩니다.',
        schema: z.object({
          question: z.string().describe('사용자의 질문 또는 검색할 키워드'),
        }),
      },
    );

    tools.push(getRagExamples);
  }

  // 시스템 프롬프트 구성
  const systemPrompt = `${SQL_EXPERT_PROMPT}\n\n${SQL_EXPERT_FEW_SHOT_EXAMPLES}`;

  // createReactAgent 사용 (Supervisor와 호환)
  const agent = createReactAgent({
    llm: model,
    tools,
    name: 'sql_expert',
    prompt: systemPrompt,
  });

  return agent;
}

export type SqlExpertAgent = ReturnType<typeof createSqlExpertAgent>;
