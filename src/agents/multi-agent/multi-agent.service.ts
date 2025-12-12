import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { createBedrockChatModel, createBedrockFastModel } from '@/agents/config/langchain.config';
import { BedrockService } from '@/common/bedrock.service';
import {
  ChartConfig,
  ClarificationSection,
  ColumnDefinition,
  ExtraVisualization,
  FewShotExample,
  FollowUpQuestion,
  InsightItem,
  MultiAgentResponse,
  QueryHistoryItem,
  ResponseType,
  WorkflowStep,
  WorkflowStepDetail,
  generateRequestId,
} from '@/dto/response/multi-agent-response.dto';
import { SearchService } from '@/modules/search/search.service';
import { RagService } from '@/rag/rag.service';

import { createMultiAgentWorkflow } from './multi-agent.workflow';

// 에이전트 표시 이름 매핑
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  supervisor: 'Supervisor',
  sql_expert: 'SQL 전문가',
  search_expert: '검색 전문가',
  insight_analyst: '인사이트 분석가',
  chart_advisor: '차트 어드바이저',
  followup_agent: '후속 질문 생성',
};

/**
 * 재시도 가능한 Bedrock 에러인지 확인
 */
function isRetryableError(error: Error): boolean {
  const retryableMessages = [
    'ThrottlingException',
    'ServiceUnavailableException',
    'ModelStreamErrorException',
    'unable to process your request',
    'Rate exceeded',
    'Too many requests',
    'temporarily unavailable',
  ];
  const errorMessage = error.message.toLowerCase();
  return retryableMessages.some((msg) => errorMessage.includes(msg.toLowerCase()));
}

/**
 * 지연 후 재시도를 위한 sleep 함수
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 에이전트 출력에서 작업 요약 생성
 */
function generateAgentSummary(
  agent: string,
  content: string,
  toolCalls?: { name: string; args: Record<string, unknown> }[],
): { summary: string; details: WorkflowStepDetail[] } {
  const details: WorkflowStepDetail[] = [];
  let summary = '';

  switch (agent) {
    case 'supervisor': {
      // Supervisor의 라우팅 결정 추출
      if (content.includes('sql_expert')) {
        summary = 'SQL 전문가에게 데이터 조회 요청';
        details.push({ type: 'decision', label: '다음 에이전트', value: 'SQL 전문가' });
      } else if (content.includes('insight_analyst')) {
        summary = '인사이트 분석가에게 결과 분석 요청';
        details.push({ type: 'decision', label: '다음 에이전트', value: '인사이트 분석가' });
      } else if (content.includes('chart_advisor')) {
        summary = '차트 어드바이저에게 시각화 요청';
        details.push({ type: 'decision', label: '다음 에이전트', value: '차트 어드바이저' });
      } else if (content.includes('followup_agent')) {
        summary = '후속 질문 생성 에이전트 호출';
        details.push({ type: 'decision', label: '다음 에이전트', value: '후속 질문 생성' });
      } else if (content.includes('FINISH') || content.includes('완료')) {
        summary = '모든 분석 완료, 결과 종합';
        details.push({ type: 'decision', label: '상태', value: '워크플로우 완료' });
      } else {
        summary = '워크플로우 조율 및 에이전트 배정';
      }
      break;
    }

    case 'sql_expert': {
      // SQL 쿼리 추출
      if (toolCalls && toolCalls.length > 0) {
        for (const tc of toolCalls) {
          if (tc.name === 'execute_sql' && tc.args?.query) {
            const query = String(tc.args.query);
            summary = 'SQL 쿼리 생성 및 실행';
            details.push({ type: 'query', label: '실행된 쿼리', value: query });

            // 쿼리 유형 분석
            if (query.toUpperCase().includes('GROUP BY')) {
              details.push({ type: 'insight', label: '쿼리 유형', value: '집계 분석' });
            } else if (query.toUpperCase().includes('ORDER BY')) {
              details.push({ type: 'insight', label: '쿼리 유형', value: '정렬된 결과' });
            } else if (query.toUpperCase().includes('JOIN')) {
              details.push({ type: 'insight', label: '쿼리 유형', value: '테이블 조인' });
            }
          }
        }
      }
      // Tool 결과에서 행 수 추출
      const rowMatch = content.match(/"rowCount"\s*:\s*(\d+)/);
      if (rowMatch) {
        const rowCount = parseInt(rowMatch[1], 10);
        details.push({ type: 'result', label: '조회 결과', value: `${rowCount}개 행` });
        if (!summary) summary = `데이터 조회 완료 (${rowCount}건)`;
      }
      if (!summary) summary = 'SQL 쿼리 생성 및 데이터 조회';
      break;
    }

    case 'insight_analyst': {
      summary = '데이터 기반 인사이트 분석';
      // 인사이트 키워드 추출
      const insightKeywords = ['매출', '성장', '감소', '증가', '트렌드', '패턴', '분석', '비교', '상위', '하위'];
      const foundKeywords = insightKeywords.filter((kw) => content.includes(kw));
      if (foundKeywords.length > 0) {
        details.push({ type: 'insight', label: '분석 주제', value: foundKeywords.slice(0, 3).join(', ') });
      }
      // 숫자 추출 (주요 지표)
      const numberMatches = content.match(/(\d{1,3}(,\d{3})*(\.\d+)?)\s*(원|%|개|건)/g);
      if (numberMatches && numberMatches.length > 0) {
        details.push({ type: 'result', label: '주요 수치', value: numberMatches.slice(0, 2).join(', ') });
      }
      break;
    }

    case 'chart_advisor': {
      summary = '데이터 시각화 차트 추천';
      // 차트 유형 추출
      const chartTypes: Record<string, string> = {
        horizontal_bar: '가로 막대 차트',
        bar: '막대 차트',
        line: '라인 차트',
        pie: '파이 차트',
        donut: '도넛 차트',
        area: '영역 차트',
        scatter: '산점도',
        table: '테이블',
      };
      for (const [type, name] of Object.entries(chartTypes)) {
        if (content.includes(type)) {
          details.push({ type: 'chart', label: '추천 차트', value: name });
          summary = `${name} 시각화 생성`;
          break;
        }
      }
      break;
    }

    case 'followup_agent': {
      summary = '후속 질문 5개 생성';
      // 질문 수 추출
      const questionMatches = content.match(/"text"\s*:\s*"([^"]+)"/g);
      if (questionMatches) {
        details.push({ type: 'question', label: '생성된 질문 수', value: `${questionMatches.length}개` });
        // 첫 번째 질문 미리보기
        const firstQuestion = questionMatches[0].match(/"text"\s*:\s*"([^"]+)"/);
        if (firstQuestion) {
          details.push({ type: 'question', label: '첫 번째 질문', value: firstQuestion[1] });
        }
      }
      break;
    }

    default:
      summary = `${agent} 작업 수행`;
  }

  return { summary, details };
}

/**
 * Multi-Agent 시스템 서비스
 * Supervisor 패턴으로 여러 전문 에이전트를 조율
 */
@Injectable()
export class MultiAgentService {
  private readonly logger = new Logger(MultiAgentService.name);
  private readonly chatModel;
  private readonly fastModel;
  private readonly workflow;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Optional() private readonly searchService?: SearchService,
    @Optional() private readonly ragService?: RagService,
    @Optional() private readonly bedrockService?: BedrockService,
  ) {
    // Sonnet 모델: SQL Expert, Insight Analyst, Supervisor (복잡한 추론)
    this.chatModel = createBedrockChatModel();
    // Haiku 모델: Chart Advisor, Followup Agent, Search Expert (빠른 응답)
    this.fastModel = createBedrockFastModel();

    this.workflow = createMultiAgentWorkflow({
      model: this.chatModel,
      fastModel: this.fastModel,
      dataSource,
      searchService,
      ragService,
    });

    this.logger.log('MultiAgentService initialized with Supervisor workflow (5 agents)');
    this.logger.log('모델 전략: Sonnet(SQL/Insight), Haiku(Chart/Followup/Search)');
    if (ragService) {
      this.logger.log('RAG 서비스 연동 활성화 - SQL Expert가 유사 쿼리 예제를 참조합니다');
    }
  }

  /**
   * 질의 분석: 불충분한 질의인지 확인하고 명확화 질문 생성
   */
  async analyzeQuery(query: string): Promise<ClarificationSection | null> {
    if (!this.bedrockService) {
      this.logger.warn('BedrockService not available, skipping query analysis');
      return null;
    }

    try {
      this.logger.log(`📝 질의 분석 시작: "${query}"`);
      const analysis = await this.bedrockService.analyzeQuery(query);

      if (analysis.needsClarification && analysis.questions && analysis.questions.length > 0) {
        this.logger.log(`⚠️ 명확화 필요: ${analysis.reason}`);
        return {
          needsClarification: true,
          reason: analysis.reason,
          questions: analysis.questions.map((q) => ({
            type: q.type as ClarificationSection['questions'][0]['type'],
            question: q.question,
            options: q.options,
            default: q.default,
          })),
        };
      }

      this.logger.log('✅ 질의가 충분히 명확함');
      return { needsClarification: false };
    } catch (error) {
      this.logger.error('질의 분석 실패, 워크플로우 계속 진행', error);
      return null;
    }
  }

  /**
   * Multi-Agent 워크플로우 실행 (재시도 로직 포함)
   * @param query 사용자 질의
   * @param skipClarification 명확화 단계 건너뛰기 (사용자가 이미 명확화 질문에 답한 경우)
   */
  async executeQuery(query: string, skipClarification = false): Promise<MultiAgentResponse> {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const maxRetries = 3;
    let lastError: Error | null = null;

    // Step 1: 질의 분석 (명확화 필요 여부 확인)
    if (!skipClarification) {
      const clarification = await this.analyzeQuery(query);
      if (clarification?.needsClarification) {
        this.logger.log(`[${requestId}] ⚠️ 명확화 필요 - 질문 ${clarification.questions?.length || 0}개`);
        return {
          meta: {
            requestId,
            query,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime,
            agentsUsed: [],
            confidence: 0,
            responseType: 'data_only',
          },
          clarification,
        };
      }
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeQueryInternal(query, requestId, attempt);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (isRetryableError(lastError) && attempt < maxRetries) {
          // Rate Limiting 대응: 더 긴 백오프 시간 적용 (5s, 15s, 30s)
          const backoffMs = Math.min(5000 * Math.pow(3, attempt - 1), 30000); // 5s, 15s, 30s
          this.logger.warn(
            `[${requestId}] ⚠️ 재시도 가능한 오류 발생 (시도 ${attempt}/${maxRetries}), ${backoffMs}ms 후 재시도...`,
          );
          this.logger.warn(`[${requestId}]   오류: ${lastError.message}`);
          await sleep(backoffMs);
        } else {
          // 재시도 불가능한 에러 또는 마지막 시도 실패
          break;
        }
      }
    }

    // 에러 발생 시 응답 반환
    const processingTime = Date.now() - startTime;
    const errorCode = lastError && isRetryableError(lastError) ? 'SERVICE_TEMPORARILY_UNAVAILABLE' : 'WORKFLOW_ERROR';
    const suggestion =
      lastError && isRetryableError(lastError)
        ? '서비스가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해 주세요.'
        : '질문을 다시 표현해 보시거나, 더 구체적인 질문을 해주세요.';

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
        code: errorCode,
        message: lastError?.message || 'Unknown error occurred',
        suggestion,
      },
    };
  }

  /**
   * Multi-Agent 워크플로우 내부 실행
   */
  private async executeQueryInternal(query: string, requestId: string, attempt: number): Promise<MultiAgentResponse> {
    const startTime = Date.now();

    if (attempt === 1) {
      this.logger.log(`\n${'='.repeat(60)}`);
      this.logger.log(`[${requestId}] 🚀 Multi-Agent 워크플로우 시작`);
      this.logger.log(`[${requestId}] 📝 질의: ${query}`);
      this.logger.log(`${'='.repeat(60)}`);
    } else {
      this.logger.log(`[${requestId}] 🔄 재시도 ${attempt}번째...`);
    }

    // 워크플로우 단계 추적
    const workflowSteps: WorkflowStep[] = [];
    const queryHistory: QueryHistoryItem[] = [];
    // RAG에서 검색된 few-shot 예제 저장 (다음 SQL 쿼리에 연결)
    let pendingFewShotExamples: FewShotExample[] = [];
    let stepCounter = 0;

    // 스트리밍으로 각 단계 추적
    let stepCount = 0;
    const agentsInvoked: string[] = [];
    // 각 스텝의 시작/종료 시간 추적을 위한 변수
    let previousStepEndTime = startTime;

    try {
      const stream = await this.workflow.stream(
        { messages: [new HumanMessage(query)] },
        { recursionLimit: 50 }, // ReAct 에이전트 도구 호출을 위해 충분한 한도 설정
      );

      // 모든 노드의 메시지를 누적 수집
      const allCollectedMessages: (HumanMessage | AIMessage)[] = [];
      let finalResult: { messages: (HumanMessage | AIMessage)[] } = { messages: [] };

      for await (const chunk of stream) {
        stepCount++;
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;

        // 청크 정보 로깅
        this.logger.log(`\n[${requestId}] 📍 Step ${stepCount} (${elapsed}ms)`);

        // 청크 키 확인 (어떤 노드가 실행되었는지)
        const chunkKeys = Object.keys(chunk);
        this.logger.log(`[${requestId}]   노드: ${chunkKeys.join(', ')}`);

        for (const key of chunkKeys) {
          const nodeOutput = chunk[key];
          // 이 스텝의 시작 시간은 이전 스텝의 종료 시간 (스트림이 도착한 시점이 종료 시점)
          const stepStartTime = previousStepEndTime;
          const stepEndTime = Date.now();

          if (key === 'supervisor') {
            this.logger.log(`[${requestId}]   🎯 Supervisor 결정`);

            // Supervisor 단계 기록
            const stepDuration = stepEndTime - stepStartTime;
            const step: WorkflowStep = {
              id: `step_${++stepCounter}`,
              agent: 'supervisor',
              agentDisplayName: AGENT_DISPLAY_NAMES['supervisor'] || 'Supervisor',
              status: 'completed',
              startTime: stepStartTime,
              endTime: stepEndTime,
              duration: stepDuration,
            };

            if (nodeOutput?.messages) {
              const lastMsg = nodeOutput.messages[nodeOutput.messages.length - 1];
              if (lastMsg) {
                const content = typeof lastMsg.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg.content);
                step.output = content.substring(0, 300);
                this.logger.log(`[${requestId}]   내용: ${content.substring(0, 200)}...`);
                this.logger.log(`[${requestId}]   소요 시간: ${stepDuration}ms`);

                // 작업 요약 생성
                const { summary, details } = generateAgentSummary('supervisor', content);
                step.summary = summary;
                step.details = details;
              }
            }
            workflowSteps.push(step);
            // 다음 스텝의 시작 시간을 위해 현재 종료 시간 저장
            previousStepEndTime = stepEndTime;
          } else if (key !== '__end__') {
            if (!agentsInvoked.includes(key)) {
              agentsInvoked.push(key);
            }
            const stepDuration = stepEndTime - stepStartTime;
            this.logger.log(`[${requestId}]   🤖 에이전트: ${key} (${stepDuration}ms)`);

            // 에이전트 단계 기록
            const step: WorkflowStep = {
              id: `step_${++stepCounter}`,
              agent: key,
              agentDisplayName: AGENT_DISPLAY_NAMES[key] || key,
              status: 'completed',
              startTime: stepStartTime,
              endTime: stepEndTime,
              duration: stepDuration,
            };

            // 요약 생성을 위한 전체 콘텐츠 수집
            let allContent = '';
            let toolCalls: { name: string; args: Record<string, unknown> }[] = [];

            if (nodeOutput?.messages) {
              const msgCount = nodeOutput.messages.length;
              this.logger.log(`[${requestId}]   메시지 수: ${msgCount}`);

              // SQL Expert: SQL 쿼리 및 RAG 결과 추출
              if (key === 'sql_expert') {
                for (const msg of nodeOutput.messages) {
                  // AIMessage의 tool_calls에서 SQL 쿼리 및 RAG 검색 추출
                  if (msg instanceof AIMessage && msg.tool_calls && msg.tool_calls.length > 0) {
                    // tool_calls 수집
                    toolCalls = [...toolCalls, ...msg.tool_calls];

                    for (const toolCall of msg.tool_calls) {
                      // RAG few-shot 예제 검색 툴 호출 감지
                      if (toolCall.name === 'get_similar_sql_examples' && toolCall.args?.question) {
                        this.logger.log(
                          `[${requestId}]   🔍 RAG 유사 쿼리 검색: ${String(toolCall.args.question).substring(0, 50)}...`,
                        );
                      }

                      if (toolCall.name === 'execute_sql' && toolCall.args?.query) {
                        const sqlQuery = toolCall.args.query as string;
                        this.logger.log(`[${requestId}]   📝 SQL 쿼리 감지: ${sqlQuery.substring(0, 80)}...`);

                        // 이미 같은 쿼리가 추가되었는지 확인
                        const exists = queryHistory.some((q) => q.query === sqlQuery);
                        if (!exists) {
                          // pendingFewShotExamples가 있으면 이 쿼리에 연결
                          const fewShotExamples =
                            pendingFewShotExamples.length > 0 ? [...pendingFewShotExamples] : undefined;

                          if (fewShotExamples) {
                            this.logger.log(
                              `[${requestId}]   📚 Few-shot 예제 ${fewShotExamples.length}개를 SQL 쿼리에 연결`,
                            );
                            // 연결 후 초기화
                            pendingFewShotExamples = [];
                          }

                          queryHistory.push({
                            id: `query_${queryHistory.length + 1}`,
                            query: sqlQuery,
                            timestamp: Date.now(),
                            executionTime: 0,
                            rowCount: 0,
                            success: false, // ToolMessage에서 업데이트됨
                            fewShotExamples,
                          });
                        }
                      }
                    }
                  }

                  // ToolMessage에서 실행 결과 추출하여 queryHistory 업데이트
                  const msgContent = typeof msg.content === 'string' ? msg.content : '';
                  allContent += msgContent + '\n';

                  // RAG 검색 결과 (get_similar_sql_examples) 파싱
                  // 응답 형식: { found: true, count: N, examples: [{rank, score, description, sql}], hint }
                  if (msgContent.includes('"found":true') && msgContent.includes('"examples"')) {
                    try {
                      const parsed = JSON.parse(msgContent);
                      if (parsed.found && parsed.examples && Array.isArray(parsed.examples)) {
                        pendingFewShotExamples = parsed.examples.map(
                          (ex: { description: string; sql: string; score: string | number }) => ({
                            description: ex.description,
                            sql: ex.sql,
                            // score가 문자열로 올 수 있음 (예: "0.850")
                            score: typeof ex.score === 'string' ? parseFloat(ex.score) : ex.score,
                          }),
                        );
                        this.logger.log(
                          `[${requestId}]   📚 RAG few-shot 예제 ${pendingFewShotExamples.length}개 캡처됨`,
                        );
                        // 캡처된 예제 내용 로깅
                        pendingFewShotExamples.forEach((ex, idx) => {
                          this.logger.log(
                            `[${requestId}]     ${idx + 1}. ${ex.description.substring(0, 50)}... (score: ${ex.score})`,
                          );
                        });
                      }
                    } catch (e) {
                      this.logger.warn(`[${requestId}]   ⚠️ RAG 결과 파싱 실패: ${e instanceof Error ? e.message : e}`);
                    }
                  }

                  // 성공한 쿼리 결과 처리
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

                  // 실패한 쿼리 결과 처리 (에러 메시지 캡처)
                  if (msgContent.includes('"error":true')) {
                    try {
                      const parsed = JSON.parse(msgContent);
                      if (queryHistory.length > 0) {
                        const lastQuery = queryHistory[queryHistory.length - 1];
                        lastQuery.success = false;
                        lastQuery.error = parsed.message || '알 수 없는 SQL 오류';
                        this.logger.warn(`[${requestId}]   ⚠️ SQL 실행 실패: ${lastQuery.error}`);
                      }
                    } catch {
                      // JSON 파싱 실패
                    }
                  }
                }
              } else {
                // 다른 에이전트들의 콘텐츠 수집
                for (const msg of nodeOutput.messages) {
                  const msgContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                  allContent += msgContent + '\n';
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

            // 작업 요약 생성
            const { summary, details } = generateAgentSummary(key, allContent, toolCalls);
            step.summary = summary;
            step.details = details;

            workflowSteps.push(step);
            // 다음 스텝의 시작 시간을 위해 현재 종료 시간 저장
            previousStepEndTime = stepEndTime;
          }

          // 노드의 메시지를 누적 수집 (모든 메시지를 buildResponse에 전달하기 위해)
          if (nodeOutput?.messages && Array.isArray(nodeOutput.messages)) {
            for (const msg of nodeOutput.messages) {
              // AIMessage나 HumanMessage 또는 ToolMessage 등 모든 메시지 누적
              allCollectedMessages.push(msg);
            }
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
      this.logger.log(`[${requestId}]   누적 메시지 수: ${allCollectedMessages.length}`);
      this.logger.log(`${'='.repeat(60)}\n`);

      // 누적된 모든 메시지를 finalResult에 할당
      finalResult = { messages: allCollectedMessages };

      // 결과 파싱 및 응답 구성
      return this.buildResponse(requestId, query, finalResult, processingTime, workflowSteps, queryHistory);
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`\n${'='.repeat(60)}`);
      this.logger.error(`[${requestId}] ❌ 워크플로우 실패`);
      this.logger.error(`[${requestId}]   오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.logger.error(`[${requestId}]   처리 시간: ${processingTime}ms`);
      this.logger.error(`${'='.repeat(60)}\n`);

      // 에러를 throw하여 외부 재시도 로직에서 처리
      throw error;
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
    // 워크플로우 단계에서 에이전트 목록 추출 (supervisor 제외, 중복 제거)
    const agentsUsed: string[] = [...new Set(workflowSteps.map((s) => s.agent).filter((a) => a !== 'supervisor'))];
    let responseType: ResponseType = 'data_only';

    this.logger.log(`[${requestId}] 📦 응답 파싱 시작 - 메시지 수: ${messages.length}`);

    // SQL 결과 추출 (다중 결과 지원)
    const sqlResults: Array<{
      query: string;
      explanation: string;
      label?: string;
      description?: string;
      columns: ColumnDefinition[];
      rows: Record<string, unknown>[];
      rowCount: number;
      executionTime: number;
    }> = [];

    // 현재 처리 중인 SQL 데이터 (임시)
    let currentSqlData:
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

    // 인사이트 텍스트 포맷팅 함수 (번호 목록을 개행으로 분리, 내부 메시지 제거)
    const formatInsightText = (text: string): string => {
      // 내부 시스템 메시지 패턴 제거
      const internalPatterns = [
        // 에이전트 전환 메시지
        /Transferring (back )?to supervisor/gi,
        /Successfully transferred( back)? to \w+/gi,
        /transferred back to \w+/gi,
        /__end__/g,
        // AI 메타 코멘트 및 오류 메시지
        /I apologize for the error[^.]*\./gi,
        /It seems (the |that )?['"]?\w+['"]? (function|tool) is not available[^.]*\./gi,
        /the ['"]?\w+['"]? (function|tool) is not available[^.]*\./gi,
        /function is not available[^.]*\./gi,
        /tool is not available[^.]*\./gi,
        /I (cannot|can't|couldn't) (find|locate|access) the[^.]*\./gi,
        /Let me try[^.]*\./gi,
        /I'll try[^.]*\./gi,
        // 도구 호출 관련 메타 메시지
        /transfer_back_to_supervisor/gi,
        /transfer_to_supervisor/gi,
      ];

      let cleanText = text;
      for (const pattern of internalPatterns) {
        cleanText = cleanText.replace(pattern, '');
      }

      return (
        cleanText
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
            this.logger.log(
              `[${requestId}]   ✅ SQL 결과 발견 - ${parsed.data.length}개 행 (총 ${sqlResults.length + 1}번째 결과)`,
            );

            const rows = parsed.data;
            if (rows.length > 0) {
              const columns = Object.keys(rows[0]).map((key) => ({
                name: key,
                type: typeof rows[0][key] === 'number' ? 'number' : 'string',
                label: key,
              })) as ColumnDefinition[];

              // 결과를 배열에 추가 (덮어쓰지 않음)
              const sqlResult = {
                query: parsed.query || '',
                explanation: '',
                label: `결과 ${sqlResults.length + 1}`,
                description: '',
                columns,
                rows,
                rowCount: rows.length,
                executionTime: parsed.executionTime || 0,
              };
              sqlResults.push(sqlResult);

              // 현재 SQL 데이터도 업데이트 (호환성 유지)
              currentSqlData = {
                query: parsed.query || '',
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

      // ToolMessage에서 Chart 도구 결과 추출 (prepareChartData 결과)
      if (rawContent.includes('"datasets"') && rawContent.includes('"labels"')) {
        try {
          const parsed = JSON.parse(rawContent);
          // ChartConfig 형식인지 확인
          if (parsed.data?.datasets && parsed.data?.labels && parsed.type) {
            this.logger.log(`[${requestId}]   ✅ 차트 도구 결과 발견 - type: ${parsed.type}, title: ${parsed.title}`);
            visualizations = {
              recommended: true,
              reason: '데이터 시각화',
              primary: parsed,
              alternatives: [],
              extras: [],
            };
          }
        } catch {
          // JSON 파싱 실패
        }
      }

      // ToolMessage에서 recommend_chart 도구 결과 추출
      if (rawContent.includes('"recommended"') && rawContent.includes('"primaryType"')) {
        try {
          const parsed = JSON.parse(rawContent);
          if (parsed.recommended && parsed.primaryType) {
            this.logger.log(`[${requestId}]   ✅ 차트 추천 도구 결과 발견 - type: ${parsed.primaryType}`);
            // 차트 데이터 자동 생성 (SQL 결과가 있는 경우)
            const fallbackSqlData = sqlResults.length > 0 ? sqlResults[0] : currentSqlData;
            if (fallbackSqlData && fallbackSqlData.rows.length > 0) {
              const rows = fallbackSqlData.rows;
              const keys = Object.keys(rows[0]);
              const labelField = keys[0];
              const valueField = keys.find((k) => typeof rows[0][k] === 'number') || keys[1];

              const chartLabels = rows.slice(0, 10).map((r) => String(r[labelField] || ''));
              const chartData = rows.slice(0, 10).map((r) => {
                const val = r[valueField];
                if (typeof val === 'number') return val;
                const num = parseFloat(String(val).replace(/,/g, ''));
                return isNaN(num) ? 0 : num;
              });

              visualizations = {
                recommended: true,
                reason: parsed.reason || '데이터 시각화 추천',
                primary: {
                  id: `chart_${Date.now()}`,
                  type: parsed.primaryType,
                  title: query,
                  data: {
                    labels: chartLabels,
                    datasets: [
                      {
                        label: valueField,
                        data: chartData,
                        backgroundColor: '#3B82F6',
                      },
                    ],
                  },
                  options: { responsive: true },
                },
                alternatives: (parsed.alternatives || []).map((alt: string, idx: number) => ({
                  id: `alt_${alt}_${idx}`,
                  type: alt,
                  title: `${query} (${alt})`,
                  data: { labels: chartLabels, datasets: [{ label: valueField, data: chartData }] },
                  options: { responsive: true },
                })),
                extras: [],
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
          // SQL 쿼리 추출
          const sqlMatch = content.match(/```sql\n?([\s\S]*?)```/);
          if (sqlMatch && !currentSqlData?.query) {
            currentSqlData = currentSqlData || {
              query: '',
              explanation: '',
              columns: [],
              rows: [],
              rowCount: 0,
              executionTime: 0,
            };
            currentSqlData.query = sqlMatch[1].trim();
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

                // 결과를 배열에 추가
                const sqlResult = {
                  query: currentSqlData?.query || '',
                  explanation: '',
                  label: `결과 ${sqlResults.length + 1}`,
                  description: '',
                  columns,
                  rows,
                  rowCount: rows.length,
                  executionTime: 0,
                };
                sqlResults.push(sqlResult);

                currentSqlData = {
                  query: currentSqlData?.query || '',
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
        // 먼저 followup 내용인지 확인 (followup이면 인사이트 파싱 건너뜀)
        const isFollowupContent =
          content.includes('후속 질문') ||
          content.includes('제안 드린') ||
          content.includes('추가 질문') ||
          content.includes('"category": "comparison"') ||
          content.includes('"category": "deep_dive"') ||
          content.includes('"category": "expansion"') ||
          content.includes('"category": "action"') ||
          content.includes('"autoQuery"');

        // 인사이트 파싱 조건: insight_analyst 출력이고 followup 내용이 아닌 경우
        if (
          !isFollowupContent &&
          (content.includes('"items"') ||
            content.includes('"summary"') ||
            content.includes('"type": "trend"') ||
            content.includes('"type": "ranking"') ||
            content.includes('"type": "comparison"') ||
            content.includes('"type": "warning"') ||
            content.includes('"type": "recommendation"') ||
            content.includes('"type": "opportunity"') ||
            content.includes('"overallConfidence"'))
        ) {
          // JSON 형식 인사이트 추출
          const jsonMatch = content.match(/```json\n?([\s\S]*?)```/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[1]);
              // insight_analyst 출력 구조 검증 (summary와 items가 있고 questions가 없어야 함)
              if ((parsed.summary || parsed.items) && !parsed.questions) {
                // 내부 메시지 필터링 적용 (summary에서만)
                const cleanedSummary = formatInsightText(parsed.summary || '');

                insights = {
                  summary: cleanedSummary,
                  items: parsed.items || [],
                  overallConfidence: parsed.overallConfidence || 0.8,
                };
                responseType = 'data_with_insight';
                this.logger.log(
                  `[${requestId}]   ✅ JSON 인사이트 추출 성공 - summary: ${cleanedSummary.substring(0, 50)}...`,
                );
              }
            } catch {
              // JSON 파싱 실패
            }
          }

          // 텍스트 인사이트 추출 (JSON이 없고 SQL 데이터가 있는 경우만, followup 아닌 경우만)
          if (!insights && !isFollowupContent && content.length > 100 && (currentSqlData || sqlResults.length > 0)) {
            // 텍스트에서 주요 내용 추출
            const cleanText = content
              .replace(/```[\s\S]*?```/g, '') // 코드 블록 제거
              .trim()
              .substring(0, 1000); // 더 긴 텍스트 허용

            // followup 관련 내용 제외
            if (cleanText.length > 50 && !cleanText.includes('후속 질문') && !cleanText.includes('제안 드린')) {
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
          const fallbackSqlData = sqlResults.length > 0 ? sqlResults[0] : currentSqlData;
          if (!visualizations && fallbackSqlData) {
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
                    labels: fallbackSqlData.rows
                      .slice(0, 10)
                      .map((r, i) => String(Object.values(r)[0] || `항목${i + 1}`)),
                    datasets: [
                      {
                        label: '값',
                        data: fallbackSqlData.rows.slice(0, 10).map((r) => {
                          const values = Object.values(r);
                          // 숫자 또는 숫자 문자열 찾기
                          for (const v of values) {
                            if (typeof v === 'number') return v;
                            if (typeof v === 'string') {
                              const parsed = parseFloat(v.replace(/,/g, ''));
                              if (!isNaN(parsed) && parsed > 0) return parsed;
                            }
                          }
                          return 0;
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

    // queryHistory에서 라벨 정보를 sqlResults에 매핑
    if (queryHistory.length > 0 && sqlResults.length > 0) {
      // queryHistory의 설명/라벨 정보를 sqlResults에 매핑
      sqlResults.forEach((result, index) => {
        const historyItem = queryHistory[index];
        if (historyItem) {
          result.label = historyItem.description || historyItem.label || `결과 ${index + 1}`;
          result.description = historyItem.explanation || '';
          result.query = historyItem.query || result.query;
        }
      });
    }

    // SQL 데이터 참조 (첫 번째 결과 또는 currentSqlData)
    const sqlData = sqlResults.length > 0 ? sqlResults[0] : currentSqlData;

    // 차트 폴백: chart_advisor가 차트를 생성하지 못했지만 SQL 데이터가 있으면 자동 생성
    if (!visualizations && sqlData && sqlData.rows.length > 0) {
      this.logger.log(`[${requestId}]   📊 차트 폴백: SQL 데이터로 자동 차트 생성`);

      const rows = sqlData.rows;
      const keys = Object.keys(rows[0]);

      // 라벨 필드 찾기 (문자열 필드 우선)
      const labelField = keys.find((k) => typeof rows[0][k] === 'string') || keys[0];
      // 값 필드 찾기 (숫자 필드)
      const valueField =
        keys.find((k) => {
          const val = rows[0][k];
          if (typeof val === 'number') return true;
          if (typeof val === 'string') {
            const parsed = parseFloat(val.replace(/,/g, ''));
            return !isNaN(parsed) && parsed > 0;
          }
          return false;
        }) || keys[1];

      if (labelField && valueField) {
        const chartLabels = rows.slice(0, 10).map((r) => String(r[labelField] || ''));
        const chartData = rows.slice(0, 10).map((r) => {
          const val = r[valueField];
          if (typeof val === 'number') return val;
          const num = parseFloat(String(val).replace(/,/g, ''));
          return isNaN(num) ? 0 : num;
        });

        // 차트 유형 결정 (데이터 특성에 따라)
        let chartType: 'bar' | 'horizontal_bar' | 'pie' | 'line' = 'bar';
        const hasTimeKeyword = labelField.toLowerCase().includes('date') || labelField.toLowerCase().includes('month');
        if (hasTimeKeyword) {
          chartType = 'line';
        } else if (rows.length > 7) {
          chartType = 'horizontal_bar';
        } else if (rows.length <= 5) {
          chartType = 'pie';
        }

        visualizations = {
          recommended: true,
          reason: '데이터 기반 자동 시각화',
          primary: {
            id: `fallback_chart_${Date.now()}`,
            type: chartType,
            title: query,
            data: {
              labels: chartLabels,
              datasets: [
                {
                  label: valueField,
                  data: chartData,
                  backgroundColor:
                    chartType === 'pie'
                      ? ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
                      : '#3B82F6',
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: chartType === 'horizontal_bar' ? 'y' : 'x',
            },
          },
          alternatives: [],
          extras: [],
        };

        this.logger.log(`[${requestId}]   ✅ 폴백 차트 생성 완료 - type: ${chartType}`);
      }
    }

    // responseType 결정
    if (visualizations && insights) {
      responseType = 'full_analysis';
    } else if (insights) {
      responseType = 'data_with_insight';
    } else if (sqlResults.length > 0 || currentSqlData) {
      responseType = 'data_only';
    }

    this.logger.log(`[${requestId}] 📊 파싱 결과:`);
    this.logger.log(
      `[${requestId}]   - SQL 데이터: ${sqlResults.length}개 결과 (총 ${sqlResults.reduce((sum, r) => sum + r.rowCount, 0)}행)`,
    );
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

    // 데이터 섹션 - multiSql 구조로 저장 (여러 쿼리 결과 지원)
    if (sqlResults.length > 0) {
      const [primary, ...additional] = sqlResults;
      response.data = {
        // 호환성을 위해 첫 번째 결과를 sql에도 저장
        sql: {
          query: primary.query,
          explanation: primary.explanation,
          columns: primary.columns,
          rows: primary.rows,
          rowCount: primary.rowCount,
          executionTime: primary.executionTime,
          label: primary.label,
          description: primary.description,
        },
        // 다중 결과는 multiSql에 저장
        multiSql: {
          totalQueries: sqlResults.length,
          primary: {
            query: primary.query,
            explanation: primary.explanation,
            columns: primary.columns,
            rows: primary.rows,
            rowCount: primary.rowCount,
            executionTime: primary.executionTime,
            label: primary.label,
            description: primary.description,
          },
          additional:
            additional.length > 0
              ? additional.map((result) => ({
                  query: result.query,
                  explanation: result.explanation,
                  columns: result.columns,
                  rows: result.rows,
                  rowCount: result.rowCount,
                  executionTime: result.executionTime,
                  label: result.label,
                  description: result.description,
                }))
              : undefined,
        },
      };
    } else if (currentSqlData) {
      // 단일 결과만 있는 경우 기존 방식 유지
      response.data = { sql: currentSqlData };
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
