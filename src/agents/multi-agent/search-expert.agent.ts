import { ChatBedrockConverse } from '@langchain/aws';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

import { SearchService } from '@/modules/search/search.service';

import { SEARCH_EXPERT_PROMPT } from './prompts';
import { createMockSearchTools, createSearchTools } from './tools';

/**
 * Search Expert Agent 생성
 * 시맨틱/하이브리드 검색 전문가
 */
export function createSearchExpertAgent(model: ChatBedrockConverse, searchService?: SearchService) {
  const tools = searchService ? createSearchTools(searchService) : createMockSearchTools();

  const agent = createReactAgent({
    llm: model,
    tools: [tools.semanticSearch, tools.hybridSearch, tools.similarProducts],
    name: 'search_expert',
    prompt: SEARCH_EXPERT_PROMPT,
  });

  return agent;
}

export type SearchExpertAgent = ReturnType<typeof createSearchExpertAgent>;
