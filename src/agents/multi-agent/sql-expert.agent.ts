import { ChatBedrockConverse } from '@langchain/aws';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { DataSource } from 'typeorm';

import { RagService } from '@/rag/rag.service';

import { SQL_EXPERT_FEW_SHOT_EXAMPLES, SQL_EXPERT_PROMPT } from './prompts';
import { createSqlTools } from './tools';

export interface SqlExpertAgentOptions {
  model: ChatBedrockConverse;
  dataSource: DataSource;
  ragService?: RagService;
}

/**
 * SQL Expert Agent 생성
 * 자연어를 SQL로 변환하고 실행
 *
 * StateGraph + ToolNode 방식 (최신 LangGraph.js 권장 방식)
 * - 스키마는 프롬프트에 이미 포함됨
 * - execute_sql 도구만 제공하여 불필요한 도구 호출 방지
 * - RAG 서비스를 통해 유사 SQL 예제를 동적으로 참고
 */
export function createSqlExpertAgent(options: SqlExpertAgentOptions) {
  const { model, dataSource, ragService } = options;
  const { executeSQL } = createSqlTools(dataSource);
  const tools = [executeSQL];

  // 도구를 바인딩한 모델
  const modelWithTools = model.bindTools(tools);

  // ToolNode 생성
  const toolNode = new ToolNode(tools);

  // 조건부 라우팅: 도구 호출이 있으면 tools로, 없으면 종료
  const shouldContinue = (state: typeof MessagesAnnotation.State): 'tools' | typeof END => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage && (lastMessage as AIMessage).tool_calls?.length) {
      return 'tools';
    }
    return END;
  };

  // 모델 호출 노드 (RAG 컨텍스트 동적 추가)
  const callModel = async (
    state: typeof MessagesAnnotation.State,
  ): Promise<Partial<typeof MessagesAnnotation.State>> => {
    // 기본 시스템 프롬프트
    let systemPrompt = `${SQL_EXPERT_PROMPT}\n\n${SQL_EXPERT_FEW_SHOT_EXAMPLES}`;

    // RAG 서비스가 있으면 유사 예제 검색
    if (ragService) {
      try {
        // 사용자 질문 추출 (첫 번째 HumanMessage에서)
        const userMessage = state.messages.find((msg) => msg instanceof HumanMessage);
        if (userMessage) {
          const query = typeof userMessage.content === 'string' ? userMessage.content : '';

          if (query) {
            const ragContext = await ragService.getRagContext(query, 3);

            if (ragContext.examples.length > 0) {
              // RAG로 찾은 예제를 프롬프트에 추가
              const ragExamples = ragContext.examples
                .map(
                  (ex, idx) =>
                    `### RAG 예제 ${idx + 1} (유사도: ${ex.score?.toFixed(3) || 'N/A'})\n질문: ${ex.description}\n\`\`\`sql\n${ex.sql}\n\`\`\``,
                )
                .join('\n\n');

              systemPrompt += `\n\n## 🔍 RAG 검색 결과: 유사한 SQL 예제\n아래는 현재 질문과 유사한 과거 SQL 예제입니다. 이 예제들을 참고하여 쿼리를 작성하세요.\n\n${ragExamples}`;
            }
          }
        }
      } catch {
        // RAG 검색 실패 시 기본 프롬프트 사용 (로그만 남기고 계속 진행)
        console.warn('[SQL Expert] RAG 검색 실패, 기본 프롬프트 사용');
      }
    }

    const response = await modelWithTools.invoke([{ role: 'system', content: systemPrompt }, ...state.messages]);
    return { messages: [response] };
  };

  // StateGraph 구성
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue, {
      tools: 'tools',
      [END]: END,
    })
    .addEdge('tools', 'agent');

  // 컴파일 (name 필수)
  const agent = workflow.compile({
    name: 'sql_expert',
  });

  return agent;
}

export type SqlExpertAgent = ReturnType<typeof createSqlExpertAgent>;
