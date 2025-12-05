import { ChatBedrockConverse } from '@langchain/aws';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

import { FOLLOWUP_AGENT_PROMPT } from './prompts';
import { createFollowupTools } from './tools';

/**
 * Follow-up Agent 생성
 * 후속 질문 생성 및 대화 흐름 관리
 */
export function createFollowupAgent(model: ChatBedrockConverse) {
  const { generateFollowupQuestions, suggestDeepDive } = createFollowupTools();

  const agent = createReactAgent({
    llm: model,
    tools: [generateFollowupQuestions, suggestDeepDive],
    name: 'followup_agent',
    prompt: FOLLOWUP_AGENT_PROMPT,
  });

  return agent;
}

export type FollowupAgent = ReturnType<typeof createFollowupAgent>;
