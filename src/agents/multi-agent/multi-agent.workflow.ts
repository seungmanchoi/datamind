import { ChatBedrockConverse } from '@langchain/aws';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { DataSource } from 'typeorm';

import { SearchService } from '@/modules/search/search.service';
import { RagService } from '@/rag/rag.service';

import { createChartAdvisorAgent } from './chart-advisor.agent';
import { createFollowupAgent } from './followup.agent';
import { createInsightAnalystAgent } from './insight-analyst.agent';
import { createSearchExpertAgent } from './search-expert.agent';
import { createSqlExpertAgent } from './sql-expert.agent';

export interface MultiAgentWorkflowOptions {
  model: ChatBedrockConverse;
  fastModel?: ChatBedrockConverse;
  dataSource: DataSource;
  searchService?: SearchService;
  ragService?: RagService;
}

// 워크플로우 상태 정의
const WorkflowState = Annotation.Root({
  ...MessagesAnnotation.spec,
  // 다음 실행할 에이전트
  next: Annotation<string>({
    reducer: (_, y) => y,
    default: () => '',
  }),
  // 완료된 에이전트들
  completedAgents: Annotation<string[]>({
    reducer: (x, y) => [...new Set([...x, ...y])],
    default: () => [],
  }),
  // SQL 데이터 존재 여부
  hasData: Annotation<boolean>({
    reducer: (_, y) => y,
    default: () => false,
  }),
});

type WorkflowStateType = typeof WorkflowState.State;

// 사용 가능한 에이전트 목록
const AGENTS = ['sql_expert', 'search_expert', 'insight_analyst', 'chart_advisor', 'followup_agent'] as const;
type AgentName = (typeof AGENTS)[number];

/**
 * Multi-Agent StateGraph 워크플로우 생성 (Supervisor 기반)
 */
export function createMultiAgentWorkflow(options: MultiAgentWorkflowOptions) {
  const { model, fastModel, dataSource, searchService, ragService } = options;
  const lightModel = fastModel || model;

  // 에이전트들 생성
  const agents = {
    sql_expert: createSqlExpertAgent({ model, dataSource, ragService }),
    search_expert: createSearchExpertAgent(lightModel, searchService),
    insight_analyst: createInsightAnalystAgent(model),
    chart_advisor: createChartAdvisorAgent(lightModel),
    followup_agent: createFollowupAgent(lightModel),
  };

  // Supervisor 노드: 다음 에이전트 결정
  const supervisorNode = async (state: WorkflowStateType): Promise<Partial<WorkflowStateType>> => {
    const { messages, completedAgents, hasData } = state;

    // 사용자 질문 추출
    const userMessage = messages.find((m) => m instanceof HumanMessage);
    const query = userMessage?.content?.toString() || '';

    // 검색 질문 여부 판단
    const isSearchQuery = /검색|찾아|search|의미|시맨틱/.test(query);

    // 마지막 완료된 에이전트
    const lastCompleted = completedAgents[completedAgents.length - 1];

    // 다음 에이전트 결정 로직
    let next: string;

    if (completedAgents.length === 0) {
      // 첫 번째: 질문 유형에 따라 sql_expert 또는 search_expert
      next = isSearchQuery ? 'search_expert' : 'sql_expert';
    } else if (lastCompleted === 'sql_expert' || lastCompleted === 'search_expert') {
      // SQL/검색 후 → insight_analyst
      next = 'insight_analyst';
    } else if (lastCompleted === 'insight_analyst') {
      // 인사이트 후 → 데이터가 있으면 chart_advisor, 없으면 followup_agent
      next = hasData ? 'chart_advisor' : 'followup_agent';
    } else if (lastCompleted === 'chart_advisor') {
      // 차트 후 → followup_agent
      next = 'followup_agent';
    } else if (lastCompleted === 'followup_agent') {
      // 후속 질문 후 → 종료
      next = '__end__';
    } else {
      // 기본: 종료
      next = '__end__';
    }

    console.log(`[Supervisor] completed: [${completedAgents.join(', ')}], next: ${next}, hasData: ${hasData}`);

    return { next };
  };

  // 에이전트 노드 생성 함수
  const createAgentNode = (agent: ReturnType<typeof createSqlExpertAgent>, agentName: AgentName) => {
    return async (state: WorkflowStateType): Promise<Partial<WorkflowStateType>> => {
      console.log(`[${agentName}] 시작 - messages: ${state.messages.length}개`);

      try {
        const inputMessageCount = state.messages.length;
        const result = await agent.invoke({ messages: state.messages });
        const allMessages = result.messages || [];
        let newMessages = allMessages.slice(inputMessageCount);

        // 빈 응답 처리: 빈 메시지가 있으면 기본 메시지로 교체
        newMessages = newMessages.map((msg) => {
          const content = msg.content;
          const isEmpty =
            content === '' ||
            content === null ||
            content === undefined ||
            (typeof content === 'string' && content.trim() === '') ||
            (Array.isArray(content) && content.length === 0);

          if (isEmpty) {
            console.log(`[${agentName}] 빈 응답 감지, 기본 메시지로 교체`);
            return new AIMessage({
              content: `[${agentName}] 처리 완료`,
              name: agentName,
            });
          }
          return msg;
        });

        // 새 메시지가 없으면 기본 메시지 추가
        if (newMessages.length === 0) {
          console.log(`[${agentName}] 응답 없음, 기본 메시지 추가`);
          newMessages = [
            new AIMessage({
              content: `[${agentName}] 처리 완료`,
              name: agentName,
            }),
          ];
        }

        // SQL 결과 데이터 확인
        const hasData = checkForData(newMessages) || state.hasData;

        console.log(`[${agentName}] 완료 - newMessages: ${newMessages.length}개, hasData: ${hasData}`);

        return {
          messages: newMessages,
          completedAgents: [agentName],
          hasData,
        };
      } catch (error) {
        console.error(`[${agentName}] 오류:`, error);
        const errorMessage = new AIMessage({
          content: `[${agentName}] 오류: ${error instanceof Error ? error.message : 'Unknown error'}`,
          name: agentName,
        });

        return {
          messages: [errorMessage],
          completedAgents: [agentName],
        };
      }
    };
  };

  // 라우팅 함수: supervisor가 결정한 next 값에 따라 라우팅
  const routeFromSupervisor = (state: WorkflowStateType): string => {
    return state.next || '__end__';
  };

  // StateGraph 생성
  const workflow = new StateGraph(WorkflowState)
    // 노드 추가
    .addNode('supervisor', supervisorNode)
    .addNode('sql_expert', createAgentNode(agents.sql_expert, 'sql_expert'))
    .addNode('search_expert', createAgentNode(agents.search_expert, 'search_expert'))
    .addNode('insight_analyst', createAgentNode(agents.insight_analyst, 'insight_analyst'))
    .addNode('chart_advisor', createAgentNode(agents.chart_advisor, 'chart_advisor'))
    .addNode('followup_agent', createAgentNode(agents.followup_agent, 'followup_agent'))

    // START → supervisor
    .addEdge(START, 'supervisor')

    // supervisor → 각 에이전트 또는 END
    .addConditionalEdges('supervisor', routeFromSupervisor, {
      sql_expert: 'sql_expert',
      search_expert: 'search_expert',
      insight_analyst: 'insight_analyst',
      chart_advisor: 'chart_advisor',
      followup_agent: 'followup_agent',
      __end__: END,
    })

    // 각 에이전트 → supervisor (다음 결정을 위해)
    .addEdge('sql_expert', 'supervisor')
    .addEdge('search_expert', 'supervisor')
    .addEdge('insight_analyst', 'supervisor')
    .addEdge('chart_advisor', 'supervisor')
    .addEdge('followup_agent', 'supervisor');

  return workflow.compile();
}

/**
 * 메시지에서 데이터 존재 여부 확인
 */
function checkForData(messages: BaseMessage[]): boolean {
  for (const msg of messages) {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

    // SQL 결과 확인
    if (content.includes('"success":true') && content.includes('"data":')) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
          return true;
        }
      } catch {
        // 파싱 실패
      }
    }

    // rowCount 확인
    const rowMatch = content.match(/"rowCount"\s*:\s*(\d+)/);
    if (rowMatch && parseInt(rowMatch[1], 10) >= 1) {
      return true;
    }
  }

  return false;
}

export type MultiAgentWorkflow = ReturnType<typeof createMultiAgentWorkflow>;
