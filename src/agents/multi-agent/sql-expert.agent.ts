import { ChatBedrockConverse } from '@langchain/aws';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { DataSource } from 'typeorm';

import { SQL_EXPERT_FEW_SHOT_EXAMPLES, SQL_EXPERT_PROMPT } from './prompts';
import { createSqlTools } from './tools';

/**
 * SQL Expert Agent 생성
 * 자연어를 SQL로 변환하고 실행
 *
 * 최적화: execute_sql 도구만 제공하여 불필요한 도구 호출 방지
 * - 스키마는 프롬프트에 이미 포함됨
 * - get_schema 제거로 LLM 호출 횟수 감소
 */
export function createSqlExpertAgent(model: ChatBedrockConverse, dataSource: DataSource) {
  const { executeSQL } = createSqlTools(dataSource);

  const agent = createReactAgent({
    llm: model,
    // execute_sql만 제공 (스키마는 프롬프트에 포함되어 있음)
    tools: [executeSQL],
    name: 'sql_expert',
    prompt: `${SQL_EXPERT_PROMPT}\n\n${SQL_EXPERT_FEW_SHOT_EXAMPLES}`,
  });

  return agent;
}

export type SqlExpertAgent = ReturnType<typeof createSqlExpertAgent>;
