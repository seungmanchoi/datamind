import { ChatBedrockConverse } from '@langchain/aws';
import { createSupervisor } from '@langchain/langgraph-supervisor';
import { DataSource } from 'typeorm';

import { SearchService } from '@/modules/search/search.service';
import { RagService } from '@/rag/rag.service';

import { createChartAdvisorAgent } from './chart-advisor.agent';
import { createFollowupAgent } from './followup.agent';
import { createInsightAnalystAgent } from './insight-analyst.agent';
import { SUPERVISOR_PROMPT } from './prompts';
import { createSearchExpertAgent } from './search-expert.agent';
import { createSqlExpertAgent } from './sql-expert.agent';

export interface MultiAgentWorkflowOptions {
  /** 메인 모델 (Sonnet) - SQL Expert, Insight Analyst, Supervisor에 사용 */
  model: ChatBedrockConverse;
  /** 경량 모델 (Haiku) - Chart Advisor, Followup Agent에 사용 */
  fastModel?: ChatBedrockConverse;
  dataSource: DataSource;
  searchService?: SearchService;
  ragService?: RagService;
}

/**
 * Multi-Agent Supervisor 워크플로우 생성
 * 5개의 전문 에이전트를 Supervisor가 조율
 *
 * 모델 전략:
 * - Sonnet (메인): SQL Expert, Insight Analyst, Supervisor - 복잡한 추론 필요
 * - Haiku (경량): Chart Advisor, Followup Agent, Search Expert - 빠른 응답 우선
 */
export function createMultiAgentWorkflow(options: MultiAgentWorkflowOptions) {
  const { model, fastModel, dataSource, searchService, ragService } = options;

  // fastModel이 없으면 model을 사용 (fallback)
  const lightModel = fastModel || model;

  // 전문 에이전트들 생성
  // SQL Expert: Sonnet 사용 (복잡한 SQL 생성 + RAG 참조)
  const sqlExpert = createSqlExpertAgent({
    model,
    dataSource,
    ragService,
  });

  // Search Expert: Haiku 사용 (시맨틱 검색은 단순 작업)
  const searchExpert = createSearchExpertAgent(lightModel, searchService);

  // Insight Analyst: Sonnet 사용 (깊은 데이터 분석 필요)
  const insightAnalyst = createInsightAnalystAgent(model);

  // Chart Advisor: Haiku 사용 (규칙 기반 차트 추천)
  const chartAdvisor = createChartAdvisorAgent(lightModel);

  // Followup Agent: Haiku 사용 (간단한 질문 생성)
  const followupAgent = createFollowupAgent(lightModel);

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
