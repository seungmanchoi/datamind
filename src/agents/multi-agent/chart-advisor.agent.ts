import { ChatBedrockConverse } from '@langchain/aws';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

import { CHART_ADVISOR_PROMPT } from './prompts';
import { createChartTools } from './tools';

/**
 * Chart Advisor Agent 생성
 * 데이터 시각화 추천 및 차트 데이터 준비
 */
export function createChartAdvisorAgent(model: ChatBedrockConverse) {
  const { recommendChart, prepareChartData, createMetricCard } = createChartTools();

  const agent = createReactAgent({
    llm: model,
    tools: [recommendChart, prepareChartData, createMetricCard],
    name: 'chart_advisor',
    prompt: CHART_ADVISOR_PROMPT,
  });

  return agent;
}

export type ChartAdvisorAgent = ReturnType<typeof createChartAdvisorAgent>;
