import { ChatBedrockConverse } from '@langchain/aws';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

import { INSIGHT_ANALYST_PROMPT } from './prompts';
import { createAnalysisTools } from './tools';

/**
 * Insight Analyst Agent 생성
 * 데이터 분석 및 동적 인사이트 도출
 */
export function createInsightAnalystAgent(model: ChatBedrockConverse) {
  const { analyzeTrends, detectAnomalies, comparePeriods, analyzeDistribution } = createAnalysisTools();

  const agent = createReactAgent({
    llm: model,
    tools: [analyzeTrends, detectAnomalies, comparePeriods, analyzeDistribution],
    name: 'insight_analyst',
    prompt: INSIGHT_ANALYST_PROMPT,
  });

  return agent;
}

export type InsightAnalystAgent = ReturnType<typeof createInsightAnalystAgent>;
