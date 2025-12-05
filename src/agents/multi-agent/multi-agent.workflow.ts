import { ChatBedrockConverse } from '@langchain/aws';
import { createSupervisor } from '@langchain/langgraph-supervisor';
import { DataSource } from 'typeorm';

import { SearchService } from '@/modules/search/search.service';

import { createChartAdvisorAgent } from './chart-advisor.agent';
import { createFollowupAgent } from './followup.agent';
import { createInsightAnalystAgent } from './insight-analyst.agent';
import { SUPERVISOR_PROMPT } from './prompts';
import { createSearchExpertAgent } from './search-expert.agent';
import { createSqlExpertAgent } from './sql-expert.agent';

export interface MultiAgentWorkflowOptions {
  model: ChatBedrockConverse;
  dataSource: DataSource;
  searchService?: SearchService;
}

/**
 * Multi-Agent Supervisor 워크플로우 생성
 * 5개의 전문 에이전트를 Supervisor가 조율
 */
export function createMultiAgentWorkflow(options: MultiAgentWorkflowOptions) {
  const { model, dataSource, searchService } = options;

  // 전문 에이전트들 생성 (sql_expert를 먼저 배치하여 우선순위 부여)
  const sqlExpert = createSqlExpertAgent(model, dataSource);
  const searchExpert = createSearchExpertAgent(model, searchService);
  const insightAnalyst = createInsightAnalystAgent(model);
  const chartAdvisor = createChartAdvisorAgent(model);
  const followupAgent = createFollowupAgent(model);

  // Supervisor 워크플로우 생성
  const workflow = createSupervisor({
    // 에이전트 순서: 가장 자주 사용되는 것부터
    agents: [sqlExpert, searchExpert, insightAnalyst, chartAdvisor, followupAgent],
    llm: model,
    prompt: SUPERVISOR_PROMPT,
    // full_history 모드로 모든 메시지 보존 (결과 파싱을 위해 필요)
    outputMode: 'full_history',
  });

  return workflow.compile();
}

export type MultiAgentWorkflow = ReturnType<typeof createMultiAgentWorkflow>;
