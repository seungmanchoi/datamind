import { ChatBedrockConverse } from '@langchain/aws';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { DataSource } from 'typeorm';

import { SQL_EXPERT_FEW_SHOT_EXAMPLES, SQL_EXPERT_PROMPT } from './prompts';
import { createSqlTools } from './tools';

/**
 * SQL Expert Agent 생성
 * 자연어를 SQL로 변환하고 실행
 */
export function createSqlExpertAgent(model: ChatBedrockConverse, dataSource: DataSource) {
  const { getSchema, executeSQL, validateSQL } = createSqlTools(dataSource);

  const agent = createReactAgent({
    llm: model,
    tools: [getSchema, executeSQL, validateSQL],
    name: 'sql_expert',
    prompt: `${SQL_EXPERT_PROMPT}\n\n${SQL_EXPERT_FEW_SHOT_EXAMPLES}`,
  });

  return agent;
}

export type SqlExpertAgent = ReturnType<typeof createSqlExpertAgent>;
