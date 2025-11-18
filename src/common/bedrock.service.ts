import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
  ResponseStream,
} from '@aws-sdk/client-bedrock-runtime';
import { Injectable, Logger } from '@nestjs/common';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeRequest {
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
}
