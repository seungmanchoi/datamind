import { ChatBedrockConverse } from '@langchain/aws';
import { AIMessage } from '@langchain/core/messages';
import { END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { DataSource } from 'typeorm';

import { SQL_EXPERT_FEW_SHOT_EXAMPLES, SQL_EXPERT_PROMPT } from './prompts';
import { createSqlTools } from './tools';

/**
 * SQL Expert Agent 생성
 * 자연어를 SQL로 변환하고 실행
 *
 * StateGraph + ToolNode 방식 (최신 LangGraph.js 권장 방식)
 * - 스키마는 프롬프트에 이미 포함됨
 * - execute_sql 도구만 제공하여 불필요한 도구 호출 방지
 */
export function createSqlExpertAgent(model: ChatBedrockConverse, dataSource: DataSource) {
  const { executeSQL } = createSqlTools(dataSource);
  const tools = [executeSQL];

  // 시스템 프롬프트
  const systemPrompt = `${SQL_EXPERT_PROMPT}\n\n${SQL_EXPERT_FEW_SHOT_EXAMPLES}`;

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

  // 모델 호출 노드
  const callModel = async (
    state: typeof MessagesAnnotation.State,
  ): Promise<Partial<typeof MessagesAnnotation.State>> => {
    const response = await modelWithTools.invoke([
      { role: 'system', content: systemPrompt },
      ...state.messages,
    ]);
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

  // 컴파일
  const agent = workflow.compile();

  return agent;
}

export type SqlExpertAgent = ReturnType<typeof createSqlExpertAgent>;
