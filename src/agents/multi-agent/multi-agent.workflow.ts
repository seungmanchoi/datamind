import { ChatBedrockConverse } from '@langchain/aws';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { Annotation, END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { DataSource } from 'typeorm';

import { SearchService } from '@/modules/search/search.service';
import { RagService } from '@/rag/rag.service';

import { createFollowupAgent } from './followup.agent';
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
  // SQL 결과 데이터 (병렬 처리용)
  sqlResultData: Annotation<string>({
    reducer: (_, y) => y,
    default: () => '',
  }),
});

type WorkflowStateType = typeof WorkflowState.State;

// 사용 가능한 에이전트 목록
const AGENTS = ['sql_expert', 'search_expert', 'insight_analyst', 'chart_advisor', 'followup_agent'] as const;
type AgentName = (typeof AGENTS)[number];

/**
 * Multi-Agent StateGraph 워크플로우 생성 (병렬 처리 지원)
 */
export function createMultiAgentWorkflow(options: MultiAgentWorkflowOptions) {
  const { model, fastModel, dataSource, searchService, ragService } = options;
  const lightModel = fastModel || model;

  // 에이전트들 생성 (insight_analyst, chart_advisor는 병렬 노드에서 직접 LLM 호출)
  const agents = {
    sql_expert: createSqlExpertAgent({ model, dataSource, ragService }),
    search_expert: createSearchExpertAgent(lightModel, searchService),
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
      // SQL/검색 후 → 데이터가 있으면 병렬 분석, 없으면 followup_agent
      next = hasData ? 'parallel_analysis' : 'followup_agent';
    } else if (lastCompleted === 'parallel_analysis') {
      // 병렬 분석 후 → followup_agent
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

  // SQL Expert 노드 (SQL 결과 데이터 저장)
  const sqlExpertNode = async (state: WorkflowStateType): Promise<Partial<WorkflowStateType>> => {
    const agentName = 'sql_expert';
    console.log(`[${agentName}] 시작 - messages: ${state.messages.length}개`);

    try {
      const inputMessageCount = state.messages.length;
      const result = await agents.sql_expert.invoke({ messages: state.messages });
      const allMessages = result.messages || [];
      let newMessages = allMessages.slice(inputMessageCount);

      // 빈 응답 처리
      newMessages = newMessages.map((msg) => {
        const content = msg.content;
        const isEmpty =
          content === '' ||
          content === null ||
          content === undefined ||
          (typeof content === 'string' && content.trim() === '') ||
          (Array.isArray(content) && content.length === 0);

        if (isEmpty) {
          return new AIMessage({ content: `[${agentName}] 처리 완료`, name: agentName });
        }
        return msg;
      });

      if (newMessages.length === 0) {
        newMessages = [new AIMessage({ content: `[${agentName}] 처리 완료`, name: agentName })];
      }

      // SQL 결과 데이터 확인 및 저장
      const hasData = checkForData(newMessages) || state.hasData;

      // SQL 결과 데이터 추출 (병렬 처리용)
      let sqlResultData = '';
      for (const msg of newMessages) {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        if (content.includes('"success":true') && content.includes('"data":')) {
          sqlResultData += content + '\n---SQL_RESULT_SEPARATOR---\n';
        }
      }

      console.log(`[${agentName}] 완료 - newMessages: ${newMessages.length}개, hasData: ${hasData}`);

      return {
        messages: newMessages,
        completedAgents: [agentName],
        hasData,
        sqlResultData: sqlResultData || state.sqlResultData,
      };
    } catch (error) {
      console.error(`[${agentName}] 오류:`, error);
      return {
        messages: [
          new AIMessage({
            content: `[${agentName}] 오류: ${error instanceof Error ? error.message : 'Unknown'}`,
            name: agentName,
          }),
        ],
        completedAgents: [agentName],
      };
    }
  };

  // 병렬 분석 노드: insight_analyst와 chart_advisor를 동시 실행 (직접 LLM 호출)
  const parallelAnalysisNode = async (state: WorkflowStateType): Promise<Partial<WorkflowStateType>> => {
    console.log(`[parallel_analysis] 시작 - insight_analyst + chart_advisor 병렬 실행 (직접 LLM 호출)`);

    const startTime = Date.now();

    // 사용자 질문 추출
    const userMessage = state.messages.find((m) => m instanceof HumanMessage);
    const userQuery = userMessage?.content?.toString() || '';

    // SQL 결과 데이터에서 순수 JSON 데이터만 추출
    const rawSqlData = state.sqlResultData || '';

    if (!rawSqlData) {
      console.log(`[parallel_analysis] SQL 데이터 없음 - 건너뜀`);
      return {
        messages: [new AIMessage({ content: '[parallel_analysis] 분석할 데이터 없음', name: 'parallel_analysis' })],
        completedAgents: ['parallel_analysis'],
      };
    }

    // SQL 결과에서 순수 데이터만 추출 (도구 호출 메타데이터 제거)
    const extractedDataSets: Array<{ data: unknown[]; rowCount: number; query?: string }> = [];
    const sqlParts = rawSqlData.split('---SQL_RESULT_SEPARATOR---');

    for (const part of sqlParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.success && parsed.data && Array.isArray(parsed.data)) {
          extractedDataSets.push({
            data: parsed.data,
            rowCount: parsed.rowCount || parsed.data.length,
            query: parsed.query,
          });
        }
      } catch {
        // JSON 파싱 실패 - 무시
      }
    }

    if (extractedDataSets.length === 0) {
      console.log(`[parallel_analysis] 추출된 데이터셋 없음 - 건너뜀`);
      return {
        messages: [new AIMessage({ content: '[parallel_analysis] 유효한 데이터 없음', name: 'parallel_analysis' })],
        completedAgents: ['parallel_analysis'],
      };
    }

    // 분석용 깨끗한 데이터 문자열 생성
    const cleanDataString = extractedDataSets
      .map((ds, idx) => {
        const preview = ds.data.slice(0, 20); // 최대 20행만
        return `### 데이터셋 ${idx + 1} (${ds.rowCount}행)\n${JSON.stringify(preview, null, 2)}`;
      })
      .join('\n\n');

    console.log(`[parallel_analysis] ${extractedDataSets.length}개 데이터셋 추출 완료`);

    // 데이터셋 개수
    const datasetCount = extractedDataSets.length;

    // insight_analyst와 chart_advisor 병렬 실행 (직접 LLM 호출)
    const [insightResult, chartResult] = await Promise.allSettled([
      // Insight Analyst - 직접 LLM 호출 (종합 인사이트)
      (async () => {
        try {
          console.log(`[insight_analyst] 병렬 시작 (직접 LLM 호출) - ${datasetCount}개 데이터셋 종합 분석`);

          const insightPrompt = `당신은 비즈니스 데이터 분석 전문가입니다.

## 분석 요청
아래 ${datasetCount}개의 데이터셋을 **종합적으로** 분석하여 비즈니스 인사이트를 제공해주세요.

## 사용자 질문
${userQuery}

## 데이터 (${datasetCount}개 데이터셋)
${cleanDataString}

## 분석 지침
1. **각 데이터셋 개별 분석**: 각 데이터셋의 핵심 특징과 패턴 파악
2. **데이터셋 간 비교 분석**: 여러 데이터셋 간의 연관성, 차이점, 상관관계 분석
3. **종합 인사이트 도출**: 전체 데이터를 종합한 비즈니스 시사점

## 필수 인사이트 항목 (최소 ${Math.min(datasetCount + 2, 5)}개 이상)
- 각 데이터셋별 핵심 발견 (ranking 또는 trend)
- 데이터셋 간 비교 분석 (comparison)
- 실행 가능한 권고사항 (recommendation)

## 출력 형식 (반드시 이 JSON 형식으로 응답)
\`\`\`json
{
  "summary": "전체 ${datasetCount}개 데이터셋을 종합 분석한 핵심 메시지 (구체적 수치 포함, 2-3문장)",
  "items": [
    {
      "type": "ranking",
      "icon": "🏆",
      "title": "데이터셋1: 핵심 발견",
      "content": "구체적인 분석 내용 (수치 포함)",
      "importance": "high",
      "confidence": 0.9
    },
    {
      "type": "comparison",
      "icon": "⚖️",
      "title": "데이터셋 간 비교",
      "content": "데이터셋1과 데이터셋2의 비교 분석",
      "importance": "high",
      "confidence": 0.85
    },
    {
      "type": "recommendation",
      "icon": "💡",
      "title": "종합 권고사항",
      "content": "전체 분석을 바탕으로 한 실행 권고",
      "importance": "medium",
      "confidence": 0.8
    }
  ],
  "overallConfidence": 0.85
}
\`\`\`

인사이트 유형과 아이콘:
- ranking 🏆: 순위/TOP 분석
- trend 📈: 트렌드/추이 분석
- comparison ⚖️: 비교 분석
- warning ⚠️: 주의사항/리스크
- recommendation 💡: 권고사항
- opportunity 🎯: 기회 발견`;

          const response = await model.invoke([new HumanMessage({ content: insightPrompt })]);
          const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

          console.log(`[insight_analyst] 병렬 완료 - 응답 길이: ${content.length}`);
          return new AIMessage({ content, name: 'insight_analyst' });
        } catch (error) {
          console.error(`[insight_analyst] 병렬 오류:`, error);
          return new AIMessage({
            content: `[insight_analyst] 오류: ${error instanceof Error ? error.message : 'Unknown'}`,
            name: 'insight_analyst',
          });
        }
      })(),
      // Chart Advisor - 직접 LLM 호출 (각 데이터셋별 차트)
      (async () => {
        try {
          console.log(`[chart_advisor] 병렬 시작 (직접 LLM 호출) - ${datasetCount}개 데이터셋별 차트 생성`);

          const chartPrompt = `당신은 데이터 시각화 전문가입니다.

## 차트 생성 요청
아래 ${datasetCount}개의 데이터셋 **각각에 대해** 적합한 차트를 생성해주세요.
**반드시 ${datasetCount}개의 차트**를 생성해야 합니다.

## 사용자 질문
${userQuery}

## 데이터 (${datasetCount}개 데이터셋)
${cleanDataString}

## 차트 유형 선택 기준
- 항목 ≤7개 비교: bar
- 항목 >7개 비교: horizontal_bar
- 시간별 추이 (날짜/월/연도): line
- 비율/구성비 (≤5개): pie 또는 donut

## 차트 색상
- 기본: "#3B82F6" (파란색)
- 추가 색상: ["#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"]

## 출력 형식 (반드시 이 JSON 형식으로 응답)
**중요: ${datasetCount}개 데이터셋이므로 primary 1개 + alternatives ${datasetCount - 1}개 = 총 ${datasetCount}개 차트 필요**

\`\`\`json
{
  "recommended": true,
  "reason": "${datasetCount}개 데이터셋 시각화",
  "primary": {
    "id": "chart_1",
    "type": "bar",
    "title": "데이터셋1: 차트 제목",
    "data": {
      "labels": ["항목1", "항목2", "항목3"],
      "datasets": [{
        "label": "값 필드명",
        "data": [100, 200, 150],
        "backgroundColor": "#3B82F6"
      }]
    },
    "options": { "responsive": true }
  },
  "alternatives": [
    {
      "id": "chart_2",
      "type": "horizontal_bar",
      "title": "데이터셋2: 차트 제목",
      "data": {
        "labels": ["항목A", "항목B"],
        "datasets": [{
          "label": "값 필드명",
          "data": [300, 400],
          "backgroundColor": "#10B981"
        }]
      },
      "options": { "responsive": true }
    }
  ]
}
\`\`\`

**필수 사항**:
1. 각 데이터셋의 실제 데이터를 labels와 data에 매핑
2. 차트 제목에 데이터셋 내용을 반영
3. 각 차트마다 다른 색상 사용`;

          const response = await lightModel.invoke([new HumanMessage({ content: chartPrompt })]);
          const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

          console.log(`[chart_advisor] 병렬 완료 - 응답 길이: ${content.length}`);
          return new AIMessage({ content, name: 'chart_advisor' });
        } catch (error) {
          console.error(`[chart_advisor] 병렬 오류:`, error);
          return new AIMessage({
            content: `[chart_advisor] 오류: ${error instanceof Error ? error.message : 'Unknown'}`,
            name: 'chart_advisor',
          });
        }
      })(),
    ]);

    // 결과 병합
    const allNewMessages: BaseMessage[] = [];

    // Insight 결과 처리
    if (insightResult.status === 'fulfilled') {
      allNewMessages.push(insightResult.value);
    } else {
      allNewMessages.push(new AIMessage({ content: '[insight_analyst] 처리 실패', name: 'insight_analyst' }));
    }

    // Chart 결과 처리
    if (chartResult.status === 'fulfilled') {
      allNewMessages.push(chartResult.value);
    } else {
      allNewMessages.push(new AIMessage({ content: '[chart_advisor] 처리 실패', name: 'chart_advisor' }));
    }

    const duration = Date.now() - startTime;
    console.log(`[parallel_analysis] 완료 - ${allNewMessages.length}개 메시지, ${duration}ms`);

    return {
      messages: allNewMessages,
      completedAgents: ['parallel_analysis'],
    };
  };

  // 일반 에이전트 노드 생성 함수
  const createAgentNode = (agent: ReturnType<typeof createSqlExpertAgent>, agentName: AgentName) => {
    return async (state: WorkflowStateType): Promise<Partial<WorkflowStateType>> => {
      console.log(`[${agentName}] 시작 - messages: ${state.messages.length}개`);

      try {
        const inputMessageCount = state.messages.length;
        const result = await agent.invoke({ messages: state.messages });
        const allMessages = result.messages || [];
        let newMessages = allMessages.slice(inputMessageCount);

        // 빈 응답 처리
        newMessages = newMessages.map((msg) => {
          const content = msg.content;
          const isEmpty =
            content === '' ||
            content === null ||
            content === undefined ||
            (typeof content === 'string' && content.trim() === '') ||
            (Array.isArray(content) && content.length === 0);

          if (isEmpty) {
            return new AIMessage({ content: `[${agentName}] 처리 완료`, name: agentName });
          }
          return msg;
        });

        if (newMessages.length === 0) {
          newMessages = [new AIMessage({ content: `[${agentName}] 처리 완료`, name: agentName })];
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
        return {
          messages: [
            new AIMessage({
              content: `[${agentName}] 오류: ${error instanceof Error ? error.message : 'Unknown'}`,
              name: agentName,
            }),
          ],
          completedAgents: [agentName],
        };
      }
    };
  };

  // 라우팅 함수
  const routeFromSupervisor = (state: WorkflowStateType): string => {
    return state.next || '__end__';
  };

  // StateGraph 생성
  const workflow = new StateGraph(WorkflowState)
    // 노드 추가
    .addNode('supervisor', supervisorNode)
    .addNode('sql_expert', sqlExpertNode)
    .addNode('search_expert', createAgentNode(agents.search_expert, 'search_expert'))
    .addNode('parallel_analysis', parallelAnalysisNode)
    .addNode('followup_agent', createAgentNode(agents.followup_agent, 'followup_agent'))

    // START → supervisor
    .addEdge(START, 'supervisor')

    // supervisor → 각 에이전트 또는 END
    .addConditionalEdges('supervisor', routeFromSupervisor, {
      sql_expert: 'sql_expert',
      search_expert: 'search_expert',
      parallel_analysis: 'parallel_analysis',
      followup_agent: 'followup_agent',
      __end__: END,
    })

    // 각 에이전트 → supervisor
    .addEdge('sql_expert', 'supervisor')
    .addEdge('search_expert', 'supervisor')
    .addEdge('parallel_analysis', 'supervisor')
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
