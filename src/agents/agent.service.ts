import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { createBedrockChatModel } from './config/langchain.config';
import { SchemaRetrievalTool, SqlExecutorTool } from './tools';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly chatModel;
  private readonly sqlExecutor: SqlExecutorTool;
  private readonly schemaRetrieval: SchemaRetrievalTool;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    this.chatModel = createBedrockChatModel();
    this.sqlExecutor = new SqlExecutorTool(dataSource);
    this.schemaRetrieval = new SchemaRetrievalTool(dataSource);
    this.logger.log('AgentService initialized with Bedrock ChatModel and Tools');
  }

  /**
   * 간단한 프롬프트 실행 테스트
   * @param prompt - 입력 프롬프트
   * @returns AI 응답
   */
  async testPrompt(prompt: string): Promise<string> {
    this.logger.log(`Testing prompt: ${prompt}`);

    try {
      const response = await this.chatModel.invoke(prompt);
      this.logger.log('Prompt execution successful');
      return response.content as string;
    } catch (error) {
      this.logger.error('Failed to execute prompt', error);
      throw error;
    }
  }

  /**
   * 채팅 모델 인스턴스 반환 (다른 Agent에서 재사용)
   */
  getChatModel() {
    return this.chatModel;
  }

  /**
   * SQL Executor Tool 반환
   */
  getSqlExecutor(): SqlExecutorTool {
    return this.sqlExecutor;
  }

  /**
   * Schema Retrieval Tool 반환
   */
  getSchemaRetrieval(): SchemaRetrievalTool {
    return this.schemaRetrieval;
  }

  /**
   * 모든 Tool 목록 반환
   */
  getAllTools() {
    return [this.sqlExecutor, this.schemaRetrieval];
  }
}
