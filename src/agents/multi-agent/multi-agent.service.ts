import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { createBedrockChatModel } from '@/agents/config/langchain.config';
import {
  ChartConfig,
  ColumnDefinition,
  ExtraVisualization,
  FollowUpQuestion,
  InsightItem,
  MultiAgentResponse,
  QueryHistoryItem,
  ResponseType,
  WorkflowStep,
  generateRequestId,
} from '@/dto/response/multi-agent-response.dto';

// 에이전트 표시 이름 매핑
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  supervisor: 'Supervisor',
  sql_expert: 'SQL 전문가',
  search_expert: '검색 전문가',
  insight_analyst: '인사이트 분석가',
  chart_advisor: '차트 어드바이저',
  followup_agent: '후속 질문 생성',
};
import { SearchService } from '@/modules/search/search.service';

import { createMultiAgentWorkflow } from './multi-agent.workflow';

/**
 * Multi-Agent 시스템 서비스
 * Supervisor 패턴으로 여러 전문 에이전트를 조율
 */
@Injectable()
export class MultiAgentService {
  private readonly logger = new Logger(MultiAgentService.name);
  private readonly chatModel;
  private readonly workflow;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Optional() private readonly searchService?: SearchService,
  ) {
    this.chatModel = createBedrockChatModel();
    this.workflow = createMultiAgentWorkflow({
      model: this.chatModel,
      dataSource,
      searchService,
    });
    this.logger.log('MultiAgentService initialized with Supervisor workflow (5 agents)');
  }

  /**
   * Multi-Agent 워크플로우 실행
   */
  async executeQuery(query: string): Promise<MultiAgentResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    this.logger.log(`\n${'='.repeat(60)}`);
    this.logger.log(`[${requestId}] 🚀 Multi-Agent 워크플로우 시작`);
    this.logger.log(`[${requestId}] 📝 질의: ${query}`);
    this.logger.log(`${'='.repeat(60)}`);

    // 워크플로우 단계 추적
    const workflowSteps: WorkflowStep[] = [];
    const queryHistory: QueryHistoryItem[] = [];
    let stepCounter = 0;

    try {
      // 스트리밍으로 각 단계 추적
      let stepCount = 0;
      const agentsInvoked: string[] = [];

      const stream = await this.workflow.stream(
        { messages: [new HumanMessage(query)] },
        { recursionLimit: 50 }, // ReAct 에이전트 도구 호출을 위해 충분한 한도 설정
      );

      let finalResult: { messages: (HumanMessage | AIMessage)[] } = { messages: [] };

      for await (const chunk of stream) {
        stepCount++;
        const elapsed = Date.now() - startTime;

        // 청크 정보 로깅
        this.logger.log(`\n[${requestId}] 📍 Step ${stepCount} (${elapsed}ms)`);

        // 청크 키 확인 (어떤 노드가 실행되었는지)
        const chunkKeys = Object.keys(chunk);
        this.logger.log(`[${requestId}]   노드: ${chunkKeys.join(', ')}`);

        for (const key of chunkKeys) {
          const nodeOutput = chunk[key];
          const stepStartTime = Date.now();

          if (key === 'supervisor') {
            this.logger.log(`[${requestId}]   🎯 Supervisor 결정`);

            // Supervisor 단계 기록
            const step: WorkflowStep = {
              id: `step_${++stepCounter}`,
              agent: 'supervisor',
              agentDisplayName: AGENT_DISPLAY_NAMES['supervisor'] || 'Supervisor',
              status: 'completed',
              startTime: stepStartTime,
              endTime: Date.now(),
              duration: Date.now() - stepStartTime,
            };

            if (nodeOutput?.messages) {
              const lastMsg = nodeOutput.messages[nodeOutput.messages.length - 1];
              if (lastMsg) {
                const content = typeof lastMsg.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg.content);
                step.output = content.substring(0, 300);
                this.logger.log(`[${requestId}]   내용: ${content.substring(0, 200)}...`);
              }
            }
            workflowSteps.push(step);
          } else if (key !== '__end__') {
            if (!agentsInvoked.includes(key)) {
              agentsInvoked.push(key);
            }
            this.logger.log(`[${requestId}]   🤖 에이전트: ${key}`);

            // 에이전트 단계 기록
            const step: WorkflowStep = {
              id: `step_${++stepCounter}`,
              agent: key,
              agentDisplayName: AGENT_DISPLAY_NAMES[key] || key,
              status: 'completed',
              startTime: stepStartTime,
              endTime: Date.now(),
              duration: Date.now() - stepStartTime,
            };

            if (nodeOutput?.messages) {
              const msgCount = nodeOutput.messages.length;
              this.logger.log(`[${requestId}]   메시지 수: ${msgCount}`);

              // 모든 메시지에서 SQL 쿼리 추출
              if (key === 'sql_expert') {
                for (const msg of nodeOutput.messages) {
                  // AIMessage의 tool_calls에서 SQL 쿼리 추출
                  if (msg instanceof AIMessage && msg.tool_calls && msg.tool_calls.length > 0) {
                    for (const toolCall of msg.tool_calls) {
                      if (toolCall.name === 'execute_sql' && toolCall.args?.query) {
                        const sqlQuery = toolCall.args.query as string;
                        this.logger.log(`[${requestId}]   📝 SQL 쿼리 감지: ${sqlQuery.substring(0, 80)}...`);

                        // 이미 같은 쿼리가 추가되었는지 확인
                        const exists = queryHistory.some((q) => q.query === sqlQuery);
                        if (!exists) {
                          queryHistory.push({
                            id: `query_${queryHistory.length + 1}`,
                            query: sqlQuery,
                            timestamp: Date.now(),
                            executionTime: 0,
                            rowCount: 0,
                            success: false, // ToolMessage에서 업데이트됨
                          });
                        }
                      }
                    }
                  }

                  // ToolMessage에서 실행 결과 추출하여 queryHistory 업데이트
                  const msgContent = typeof msg.content === 'string' ? msg.content : '';
                  if (msgContent.includes('"success":true') && msgContent.includes('"data":')) {
                    try {
                      const parsed = JSON.parse(msgContent);
                      // 마지막 쿼리의 결과 업데이트
                      if (queryHistory.length > 0) {
                        const lastQuery = queryHistory[queryHistory.length - 1];
                        lastQuery.success = parsed.success;
                        lastQuery.rowCount = parsed.rowCount || 0;
                        lastQuery.executionTime = parsed.executionTime || 0;
                      }
                    } catch {
                      // JSON 파싱 실패
                    }
                  }
                }
              }

              // 마지막 메시지 미리보기
              const lastMsg = nodeOutput.messages[msgCount - 1];
              if (lastMsg) {
                const content = typeof lastMsg.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg.content);
                step.output = content.substring(0, 300);
                this.logger.log(`[${requestId}]   응답 미리보기: ${content.substring(0, 150)}...`);
              }
            }
            workflowSteps.push(step);
          }

          // 최종 결과 업데이트
          if (nodeOutput?.messages) {
            finalResult = nodeOutput;
          }
        }

        // 과도한 반복 감지
        if (stepCount > 10) {
          this.logger.warn(`[${requestId}]   ⚠️ 경고: Step ${stepCount} - 과도한 반복 감지`);
        }
      }

      const processingTime = Date.now() - startTime;

      this.logger.log(`\n${'='.repeat(60)}`);
      this.logger.log(`[${requestId}] ✅ 워크플로우 완료`);
      this.logger.log(`[${requestId}]   총 Step: ${stepCount}`);
      this.logger.log(`[${requestId}]   사용된 에이전트: ${agentsInvoked.join(', ')}`);
      this.logger.log(`[${requestId}]   처리 시간: ${processingTime}ms`);
      this.logger.log(`${'='.repeat(60)}\n`);

      // 결과 파싱 및 응답 구성
      return this.buildResponse(requestId, query, finalResult, processingTime, workflowSteps, queryHistory);
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`\n${'='.repeat(60)}`);
      this.logger.error(`[${requestId}] ❌ 워크플로우 실패`);
      this.logger.error(`[${requestId}]   오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.logger.error(`[${requestId}]   처리 시간: ${processingTime}ms`);
      this.logger.error(`${'='.repeat(60)}\n`);

      return {
        meta: {
          requestId,
          query,
          timestamp: new Date().toISOString(),
          processingTime,
          agentsUsed: [],
          confidence: 0,
          responseType: 'error',
        },
        error: {
          code: 'WORKFLOW_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          suggestion: '질문을 다시 표현해 보시거나, 더 구체적인 질문을 해주세요.',
        },
      };
    }
  }

  /**
   * 워크플로우 결과를 MultiAgentResponse로 변환
   */
  private buildResponse(
    requestId: string,
    query: string,
    result: { messages: (HumanMessage | AIMessage)[] },
    processingTime: number,
    workflowSteps: WorkflowStep[] = [],
    queryHistory: QueryHistoryItem[] = [],
  ): MultiAgentResponse {
    const messages = result.messages || [];
    const agentsUsed: string[] = [];
    let responseType: ResponseType = 'data_only';

    this.logger.log(`[${requestId}] 📦 응답 파싱 시작 - 메시지 수: ${messages.length}`);

    // SQL 결과 추출
    let sqlData:
      | {
          query: string;
          explanation: string;
          columns: ColumnDefinition[];
          rows: Record<string, unknown>[];
          rowCount: number;
          executionTime: number;
        }
      | undefined;

    // 인사이트 추출
    let insights:
      | {
          summary: string;
          items: InsightItem[];
          overallConfidence: number;
        }
      | undefined;

    // 차트 추출
    let visualizations:
      | {
          recommended: boolean;
          reason?: string;
          primary?: ChartConfig;
          alternatives?: ChartConfig[];
          extras?: ExtraVisualization[];
        }
      | undefined;

    // 후속 질문 추출
    let followUp:
      | {
          enabled: boolean;
          questions: FollowUpQuestion[];
        }
      | undefined;

    // 모든 메시지 내용 수집 (디버깅용)
    let allContent = '';

    // 콘텐츠에서 텍스트 추출 헬퍼 함수
    const extractTextContent = (content: unknown): string => {
      if (typeof content === 'string') {
        return content;
      }
      if (Array.isArray(content)) {
        // [{"type":"text","text":"..."}] 형식 처리
        return content
          .filter((item) => item?.type === 'text' && item?.text)
          .map((item) => item.text)
          .join('\n');
      }
      if (typeof content === 'object' && content !== null) {
        return JSON.stringify(content);
      }
      return String(content);
    };

    // 인사이트 텍스트 포맷팅 함수 (번호 목록을 개행으로 분리)
    const formatInsightText = (text: string): string => {
      return (
        text
          // 번호 목록을 개행으로 분리 (1. 2. 3. 등)
          .replace(/(\d+)\.\s+/g, '\n$1. ')
          // 첫 번째 개행 제거
          .replace(/^\n/, '')
          // 연속 개행 정리
          .replace(/\n{3,}/g, '\n\n')
          .trim()
      );
    };

    // 메시지에서 에이전트 결과 파싱
    for (const message of messages) {
      const messageType = message.constructor.name;
      // 텍스트 콘텐츠 추출 (배열 형식 처리)
      const content = extractTextContent(message.content);
      const contentType = typeof message.content;
      const isArray = Array.isArray(message.content);

      this.logger.log(
        `[${requestId}]   메시지: ${messageType}, contentType: ${contentType}, isArray: ${isArray}, 길이: ${content.length}`,
      );
      // 디버깅: 처음 200자 출력
      this.logger.log(`[${requestId}]   내용 미리보기: ${content.substring(0, 200)}...`);

      // 모든 내용 수집
      allContent += content + '\n';

      // ToolMessage에서 SQL 결과 추출 (execute_sql 도구 결과) - JSON 형식 체크
      // 원본 메시지 content가 문자열인 경우만 JSON 파싱 시도
      const rawContent = typeof message.content === 'string' ? message.content : '';
      if (rawContent.includes('"success":true') && rawContent.includes('"data":')) {
        try {
          const parsed = JSON.parse(rawContent);
          if (parsed.success && parsed.data && Array.isArray(parsed.data)) {
            this.logger.log(`[${requestId}]   ✅ SQL 결과 발견 - ${parsed.data.length}개 행`);
            if (!agentsUsed.includes('sql_expert')) {
              agentsUsed.push('sql_expert');
            }

            const rows = parsed.data;
            if (rows.length > 0) {
              const columns = Object.keys(rows[0]).map((key) => ({
                name: key,
                type: typeof rows[0][key] === 'number' ? 'number' : 'string',
                label: key,
              })) as ColumnDefinition[];

              sqlData = {
                query: '',
                explanation: '',
                columns,
                rows,
                rowCount: rows.length,
                executionTime: parsed.executionTime || 0,
              };
            }
          }
        } catch {
          // JSON 파싱 실패
        }
      }

      if (message instanceof AIMessage) {
        // SQL Expert 결과 파싱 (마크다운 형식)
        if (content.includes('execute_sql') || content.includes('SELECT')) {
          if (!agentsUsed.includes('sql_expert')) {
            agentsUsed.push('sql_expert');
          }

          // SQL 쿼리 추출
          const sqlMatch = content.match(/```sql\n?([\s\S]*?)```/);
          if (sqlMatch && !sqlData?.query) {
            sqlData = sqlData || {
              query: '',
              explanation: '',
              columns: [],
              rows: [],
              rowCount: 0,
              executionTime: 0,
            };
            sqlData.query = sqlMatch[1].trim();
          }

          // JSON 데이터 추출
          const jsonMatch = content.match(/```json\n?([\s\S]*?)```/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[1]);
              if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
                const rows = parsed.data;
                const columns = Object.keys(rows[0]).map((key) => ({
                  name: key,
                  type: typeof rows[0][key] === 'number' ? 'number' : 'string',
                  label: key,
                })) as ColumnDefinition[];

                sqlData = {
                  query: sqlData?.query || '',
                  explanation: '',
                  columns,
                  rows,
                  rowCount: rows.length,
                  executionTime: 0,
                };
              }
            } catch {
              // JSON 파싱 실패
            }
          }
        }

        // Insight Analyst 결과 파싱
        // Supervisor 메시지 패턴 감지 (계획/안내 메시지 제외)
        const isSupervisorPlanMessage =
          content.includes('하겠습니다') ||
          content.includes('드리겠습니다') ||
          content.includes('단계별로') ||
          content.includes('워크플로우를 따라') ||
          content.includes('전문가에게');

        if (
          !isSupervisorPlanMessage &&
          (content.includes('insight') ||
            content.includes('분석 결과') ||
            content.includes('주요 발견') ||
            content.includes('trend') ||
            content.includes('패턴'))
        ) {
          if (!agentsUsed.includes('insight_analyst')) {
            agentsUsed.push('insight_analyst');
          }

          // JSON 형식 인사이트 추출
          const jsonMatch = content.match(/```json\n?([\s\S]*?)```/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[1]);
              if (parsed.summary || parsed.items) {
                insights = {
                  summary: parsed.summary || '',
                  items: parsed.items || [],
                  overallConfidence: parsed.overallConfidence || 0.8,
                };
                responseType = 'data_with_insight';
              }
            } catch {
              // JSON 파싱 실패
            }
          }

          // 텍스트 인사이트 추출 (JSON이 없고 SQL 데이터가 있는 경우만)
          if (!insights && content.length > 100 && sqlData) {
            // 텍스트에서 주요 내용 추출
            const cleanText = content
              .replace(/```[\s\S]*?```/g, '') // 코드 블록 제거
              .trim()
              .substring(0, 1000); // 더 긴 텍스트 허용

            if (cleanText.length > 50) {
              // 번호 목록 포맷팅 적용
              const summaryText = formatInsightText(cleanText);
              insights = {
                summary: summaryText,
                items: [],
                overallConfidence: 0.7,
              };
              responseType = 'data_with_insight';
            }
          }
        }

        // Chart Advisor 결과 파싱 (더 넓은 범위로 감지)
        if (
          content.includes('chart') ||
          content.includes('차트') ||
          content.includes('시각화') ||
          content.includes('recommended') ||
          content.includes('horizontal_bar') ||
          content.includes('bar') ||
          content.includes('line') ||
          content.includes('pie') ||
          content.includes('datasets')
        ) {
          if (!agentsUsed.includes('chart_advisor')) {
            agentsUsed.push('chart_advisor');
          }

          // 모든 JSON 블록 찾기 (여러 개 있을 수 있음)
          const jsonMatches = content.matchAll(/```json\n?([\s\S]*?)```/g);
          for (const match of jsonMatches) {
            try {
              const parsed = JSON.parse(match[1]);
              this.logger.log(`[${requestId}]   📊 차트 JSON 발견 - keys: ${Object.keys(parsed).join(', ')}`);

              // Chart Advisor의 JSON 형식 처리 (다양한 형식 지원)
              if (parsed.recommended !== undefined || parsed.primary || parsed.type || parsed.datasets) {
                visualizations = {
                  recommended: parsed.recommended ?? true,
                  reason: parsed.reason || '',
                  primary: parsed.primary || (parsed.type ? parsed : undefined),
                  alternatives: parsed.alternatives || [],
                  extras: parsed.extras || [],
                };
                responseType = 'full_analysis';
                this.logger.log(`[${requestId}]   ✅ 차트 추천 파싱 성공 - type: ${visualizations.primary?.type}`);
                break; // 첫 번째 유효한 차트 JSON을 찾으면 중단
              }
            } catch (e) {
              this.logger.log(`[${requestId}]   ⚠️ 차트 JSON 파싱 실패: ${e instanceof Error ? e.message : 'Unknown'}`);
            }
          }

          // JSON이 없으면 텍스트에서 차트 유형 추출 시도
          if (!visualizations && sqlData) {
            const chartTypeMatch = content.match(/(bar|line|pie|horizontal_bar|area|donut|scatter|table)/i);
            if (chartTypeMatch) {
              this.logger.log(`[${requestId}]   📊 텍스트에서 차트 유형 추출: ${chartTypeMatch[1]}`);
              visualizations = {
                recommended: true,
                reason: '데이터 시각화 추천',
                primary: {
                  id: 'auto_chart',
                  type: chartTypeMatch[1].toLowerCase() as 'bar' | 'line' | 'pie' | 'horizontal_bar',
                  title: query,
                  data: {
                    labels: sqlData.rows.slice(0, 10).map((r, i) => String(Object.values(r)[0] || `항목${i + 1}`)),
                    datasets: [
                      {
                        label: '값',
                        data: sqlData.rows.slice(0, 10).map((r) => {
                          const values = Object.values(r);
                          const numVal = values.find((v) => typeof v === 'number');
                          return typeof numVal === 'number' ? numVal : 0;
                        }),
                        backgroundColor: '#3B82F6',
                      },
                    ],
                  },
                  options: { responsive: true },
                },
                alternatives: [],
                extras: [],
              };
              responseType = 'full_analysis';
            }
          }
        }

        // Followup Agent 결과 파싱
        if (content.includes('followup') || content.includes('후속') || content.includes('추가 질문')) {
          if (!agentsUsed.includes('followup_agent')) {
            agentsUsed.push('followup_agent');
          }

          const jsonMatch = content.match(/```json\n?([\s\S]*?)```/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[1]);
              if (parsed.questions && Array.isArray(parsed.questions)) {
                followUp = {
                  enabled: true,
                  questions: parsed.questions,
                };
              }
            } catch {
              // 후속 질문 파싱 실패
            }
          }
        }
      }
    }

    // responseType 결정
    if (visualizations && insights) {
      responseType = 'full_analysis';
    } else if (insights) {
      responseType = 'data_with_insight';
    } else if (sqlData) {
      responseType = 'data_only';
    }

    this.logger.log(`[${requestId}] 📊 파싱 결과:`);
    this.logger.log(`[${requestId}]   - SQL 데이터: ${sqlData ? `${sqlData.rowCount}행` : '없음'}`);
    this.logger.log(`[${requestId}]   - 인사이트: ${insights ? '있음' : '없음'}`);
    this.logger.log(`[${requestId}]   - 시각화: ${visualizations ? '있음' : '없음'}`);
    this.logger.log(`[${requestId}]   - 사용된 에이전트: ${agentsUsed.join(', ') || '없음'}`);

    // 응답 구성
    const response: MultiAgentResponse = {
      meta: {
        requestId,
        query,
        timestamp: new Date().toISOString(),
        processingTime,
        agentsUsed,
        confidence: insights?.overallConfidence || 0.8,
        responseType,
      },
    };

    // 데이터 섹션
    if (sqlData) {
      response.data = { sql: sqlData };
    }

    // 인사이트 섹션
    if (insights) {
      response.insights = insights;
    }

    // 시각화 섹션
    if (visualizations) {
      response.visualizations = visualizations;
    }

    // 후속 질문 섹션
    if (followUp) {
      response.followUp = followUp;
    }

    // 워크플로우 섹션 (항상 포함)
    response.workflow = {
      steps: workflowSteps,
      totalDuration: processingTime,
      queryHistory: queryHistory,
    };

    return response;
  }

  /**
   * 스트리밍 응답 (향후 구현)
   */
  async *streamQuery(query: string): AsyncGenerator<Partial<MultiAgentResponse>> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    this.logger.log(`[${requestId}] Starting streaming query: ${query}`);

    try {
      const stream = await this.workflow.stream({
        messages: [new HumanMessage(query)],
      });

      for await (const chunk of stream) {
        yield {
          meta: {
            requestId,
            query,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime,
            agentsUsed: [],
            confidence: 0,
            responseType: 'data_only',
          },
        };
      }
    } catch (error) {
      this.logger.error(`[${requestId}] Stream failed:`, error);
      throw error;
    }
  }
}
