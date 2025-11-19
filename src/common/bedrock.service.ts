import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
  ResponseStream,
} from '@aws-sdk/client-bedrock-runtime';
import { Injectable, Logger } from '@nestjs/common';

import { INSIGHT_GENERATION_PROMPT } from '../prompts/insight-generation.prompt';
import { QUERY_ANALYSIS_PROMPT } from '../prompts/query-analysis.prompt';
import { VISUALIZATION_SELECTION_PROMPT } from '../prompts/visualization-selection.prompt';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeRequest {
  anthropic_version: string;
  messages: ClaudeMessage[];
  max_tokens?: number;
  temperature?: number;
  system?: string;
}

export interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

@Injectable()
export class BedrockService {
  private readonly logger = new Logger(BedrockService.name);
  private client: BedrockRuntimeClient;
  private readonly modelId: string;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
  }

  /**
   * Claude 3 모델 호출
   * @param messages 대화 메시지 배열
   * @param options 추가 옵션 (max_tokens, temperature, system)
   * @returns Claude 응답
   */
  async invokeModel(
    messages: ClaudeMessage[],
    options?: {
      max_tokens?: number;
      temperature?: number;
      system?: string;
    },
  ): Promise<ClaudeResponse> {
    const request: ClaudeRequest = {
      anthropic_version: 'bedrock-2023-05-31',
      messages,
      max_tokens: options?.max_tokens || 4096,
      temperature: options?.temperature || 0.7,
      ...(options?.system && { system: options.system }),
    };

    this.logger.log(`Invoking Bedrock model: ${this.modelId}`);
    this.logger.debug(`Request: ${JSON.stringify(request, null, 2)}`);

    try {
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(request),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body)) as ClaudeResponse;

      this.logger.log(
        `Model invoked successfully. Tokens used: ${responseBody.usage.input_tokens} in, ${responseBody.usage.output_tokens} out`,
      );
      this.logger.debug(`Response: ${JSON.stringify(responseBody, null, 2)}`);

      return responseBody;
    } catch (error) {
      this.logger.error('Failed to invoke Bedrock model', error);
      throw error;
    }
  }

  /**
   * Claude 3 모델 호출 (스트리밍)
   * @param messages 대화 메시지 배열
   * @param options 추가 옵션
   * @returns 스트림 응답
   */
  async invokeModelWithStream(
    messages: ClaudeMessage[],
    options?: {
      max_tokens?: number;
      temperature?: number;
      system?: string;
    },
  ): Promise<AsyncIterable<ResponseStream>> {
    const request: ClaudeRequest = {
      anthropic_version: 'bedrock-2023-05-31',
      messages,
      max_tokens: options?.max_tokens || 4096,
      temperature: options?.temperature || 0.7,
      ...(options?.system && { system: options.system }),
    };

    this.logger.log(`Invoking Bedrock model with streaming: ${this.modelId}`);

    try {
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(request),
      });

      const response = await this.client.send(command);

      if (!response.body) {
        throw new Error('No response body received from Bedrock');
      }

      return response.body;
    } catch (error) {
      this.logger.error('Failed to invoke Bedrock model with streaming', error);
      throw error;
    }
  }

  /**
   * Text-to-SQL 변환을 위한 헬퍼 메서드
   * @param userQuery 사용자 자연어 질의
   * @param schema 데이터베이스 스키마 정보
   * @returns SQL 쿼리
   */
  async generateSQL(userQuery: string, schema: string): Promise<string> {
    const systemPrompt = `You are an expert SQL query generator.
Given a database schema and a natural language query, generate a valid MySQL query.
Only return the SQL query without any explanation or markdown formatting.`;

    const userMessage = `Database Schema:
${schema}

User Query: ${userQuery}

Generate a MySQL query for the above request.`;

    const response = await this.invokeModel(
      [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      {
        system: systemPrompt,
        max_tokens: 2048,
        temperature: 0.3, // 낮은 temperature로 일관성 있는 SQL 생성
      },
    );

    if (response.content && response.content.length > 0) {
      return response.content[0].text.trim();
    }

    throw new Error('No SQL query generated from Bedrock response');
  }

  /**
   * 질의 분석 (Phase 7)
   * 사용자 질의가 불충분한지 판단하고 필요시 추가 질문을 생성합니다
   * @param userQuery 사용자 질문
   * @returns 질의 분석 결과 (추가 질문 포함 여부)
   */
  async analyzeQuery(userQuery: string): Promise<{
    needsClarification: boolean;
    reason?: string;
    questions?: Array<{
      type: 'period' | 'limit' | 'filter' | 'grouping' | 'category';
      question: string;
      options: string[];
      default: string;
    }>;
  }> {
    const prompt = QUERY_ANALYSIS_PROMPT.replace('{{USER_QUERY}}', userQuery);

    this.logger.log('Analyzing user query for clarification needs');

    const response = await this.invokeModel(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        max_tokens: 2048,
        temperature: 0.5,
      },
    );

    if (response.content && response.content.length > 0) {
      const textContent = response.content[0].text.trim();

      // JSON 응답 파싱 (코드 블록이나 마크다운 제거)
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          this.logger.log(`Query analysis complete. Needs clarification: ${result.needsClarification}`);
          return result;
        } catch (error) {
          this.logger.error('Failed to parse query analysis JSON', error);
          // JSON 파싱 실패 시 기본값 반환
          return {
            needsClarification: false,
          };
        }
      }
    }

    throw new Error('No query analysis result from Bedrock response');
  }

  /**
   * 인사이트 생성 (Phase 7)
   * SQL 쿼리 결과를 분석하여 풍부한 인사이트를 생성합니다
   * @param userQuery 사용자 질문
   * @param sqlQuery 실행된 SQL
   * @param queryResults 쿼리 결과 데이터
   * @returns AI 분석 인사이트
   */
  async generateInsights(
    userQuery: string,
    sqlQuery: string,
    queryResults: unknown[],
  ): Promise<{
    summary: string;
    keyFindings: string[];
    comparison?: string;
    trend?: string;
    anomaly?: string;
    recommendation?: string;
  }> {
    const prompt = INSIGHT_GENERATION_PROMPT.replace('{{USER_QUERY}}', userQuery)
      .replace('{{SQL_QUERY}}', sqlQuery)
      .replace('{{QUERY_RESULTS}}', JSON.stringify(queryResults, null, 2));

    this.logger.log('Generating insights from query results');

    const response = await this.invokeModel(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        max_tokens: 3072,
        temperature: 0.7,
      },
    );

    if (response.content && response.content.length > 0) {
      const textContent = response.content[0].text.trim();

      // JSON 응답 파싱
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          this.logger.log('Insights generated successfully');
          return result;
        } catch (error) {
          this.logger.error('Failed to parse insights JSON', error);
          // JSON 파싱 실패 시 기본 인사이트 반환
          return {
            summary: '데이터 분석 결과를 확인하세요.',
            keyFindings: ['📊 쿼리가 성공적으로 실행되었습니다'],
          };
        }
      }
    }

    throw new Error('No insights generated from Bedrock response');
  }

  /**
   * 시각화 선택 (Phase 7)
   * 데이터 특성에 따라 최적의 시각화 방법을 결정합니다
   * @param userQuery 사용자 질문
   * @param sqlQuery 실행된 SQL
   * @param queryResults 쿼리 결과 데이터
   * @returns 시각화 추천 정보
   */
  async selectVisualization(
    userQuery: string,
    sqlQuery: string,
    queryResults: unknown[],
  ): Promise<{
    type: 'chart' | 'table' | 'both';
    chartType?: 'bar' | 'line' | 'pie';
    reason: string;
  }> {
    // 결과 구조 분석 (컬럼명, 데이터 타입 등)
    const resultStructure =
      queryResults.length > 0
        ? {
            columns: Object.keys(queryResults[0] as Record<string, unknown>),
            rowCount: queryResults.length,
            sample: queryResults[0],
          }
        : { columns: [], rowCount: 0, sample: null };

    const prompt = VISUALIZATION_SELECTION_PROMPT.replace('{{USER_QUERY}}', userQuery)
      .replace('{{SQL_QUERY}}', sqlQuery)
      .replace('{{RESULT_STRUCTURE}}', JSON.stringify(resultStructure, null, 2));

    this.logger.log('Selecting optimal visualization type');

    const response = await this.invokeModel(
      [
        {
          role: 'user',
          content: prompt,
        },
      ],
      {
        max_tokens: 1536,
        temperature: 0.5,
      },
    );

    if (response.content && response.content.length > 0) {
      const textContent = response.content[0].text.trim();

      // JSON 응답 파싱
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0]);
          this.logger.log(`Visualization selected: ${result.type}${result.chartType ? ` (${result.chartType})` : ''}`);
          return result;
        } catch (error) {
          this.logger.error('Failed to parse visualization JSON', error);
          // JSON 파싱 실패 시 기본 시각화 반환
          return {
            type: 'table',
            reason: '데이터를 테이블 형식으로 표시합니다.',
          };
        }
      }
    }

    throw new Error('No visualization selection from Bedrock response');
  }
}
