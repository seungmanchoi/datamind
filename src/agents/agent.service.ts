import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { SearchService } from '@/modules/search/search.service';

import { createBedrockChatModel } from './config/langchain.config';
import { initializeState } from './state';
import { SchemaRetrievalTool, SqlExecutorTool } from './tools';
import { createDataInsightWorkflow } from './workflows';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly chatModel;
  private readonly sqlExecutor: SqlExecutorTool;
  private readonly schemaRetrieval: SchemaRetrievalTool;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly searchService: SearchService,
  ) {
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

  /**
   * 데이터 인사이트 워크플로우 실행
   * 사용자 질의 → SQL 생성 → 실행 → 인사이트 요약
   * @param query - 사용자의 자연어 질의
   * @returns 워크플로우 실행 결과 (SQL, 결과, 요약)
   */
  async executeDataInsightWorkflow(query: string) {
    this.logger.log(`Executing data insight workflow for query: ${query}`);

    try {
      // 워크플로우 생성
      const workflow = createDataInsightWorkflow();

      // State 초기화
      const initialState = initializeState(query);

      // 워크플로우 실행 (Tool과 LLM을 config로 전달)
      const result = await workflow.invoke(initialState, {
        configurable: {
          chatModel: this.chatModel,
          sqlExecutor: this.sqlExecutor,
          schemaRetrieval: this.schemaRetrieval,
          searchService: this.searchService,
        },
      });

      this.logger.log('Workflow execution completed');

      // 결과 반환
      return {
        input: result.input,
        queryType: result.queryType,
        sqlQuery: result.sqlQuery,
        queryResult: result.queryResult,
        semanticResults: result.semanticResults,
        summary: result.summary,
        error: result.error,
        metadata: result.metadata,
      };
    } catch (error) {
      this.logger.error('Failed to execute workflow', error);
      throw error;
    }
  }
}
