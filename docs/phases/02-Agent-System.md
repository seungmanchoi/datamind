# Phase 2: Agent System

## 📋 작업 정의 및 목표 (What & Why)

### What
LangChain과 LangGraph를 사용하여 Multi-Agent 시스템을 구축합니다. Text-to-SQL Agent, SQL Executor, Insight Summarizer Agent를 협업 구조로 연결하여 복잡한 질의를 처리합니다.

### Why
- 단순 SQL 실행을 넘어 데이터 분석 및 인사이트 제공
- Agent 간 협업으로 복잡한 질의 처리 (예: "지난 주 대비 이번 주 매출 증가율을 분석해줘")
- 상태 기반 워크플로우로 오류 복구 및 재시도 가능
- 확장 가능한 Agent 아키텍처 구축

### 달성 결과
- LangChain Tools/Chains 기반 Agent 구현
- LangGraph 상태 기반 워크플로우 구성
- 자연어 질의 → 분석 → 인사이트 생성 파이프라인 완성

---

## 🔧 기술 스펙 및 제약사항

### 사용 기술 스택
- **LangChain**: langchain ^0.1.0
- **LangGraph**: langgraph ^0.0.20
- **LangChain Community**: @langchain/community
- **AWS Bedrock Adapter**: @langchain/aws (Bedrock ChatModel)
- **TypeScript**: 5.x

### 필요한 패키지
```bash
pnpm add langchain langgraph @langchain/community @langchain/aws
pnpm add zod  # Schema validation
```

### Agent 구성
1. **Text-to-SQL Agent**: 자연어 → SQL 변환
2. **SQL Executor Tool**: SQL 실행 및 결과 반환
3. **Insight Summarizer Agent**: 결과 분석 및 요약
4. **Router Agent**: 질의 타입 분류 및 워크플로우 결정

### 제약사항
- LangGraph State는 JSON serializable해야 함
- Agent 간 통신은 State를 통해서만 가능
- Bedrock 모델별 토큰 제한 준수
- Agent 실행 타임아웃 설정 필요 (60초)

---

## 📝 Task 목록

### Task 2.1: LangChain 기본 구조 설정

#### What & Why
LangChain을 NestJS에 통합하고 Bedrock ChatModel을 설정합니다.

#### Tech Spec
- `@langchain/aws` - BedrockChat 모델
- `langchain` - Core primitives
- Model: Claude 3 Sonnet

#### How

1. `src/agents/config/langchain.config.ts` 생성:
```typescript
import { BedrockChat } from '@langchain/community/chat_models/bedrock';

export const createBedrockChatModel = (modelId = 'anthropic.claude-3-sonnet-20240229-v1:0') => {
  return new BedrockChat({
    model: modelId,
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    temperature: 0,
    maxTokens: 4096,
  });
};
```

2. `src/agents/agents.module.ts` 생성:
```typescript
import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';

@Module({
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentsModule {}
```

#### Acceptance Criteria
- [ ] BedrockChat 모델 초기화 성공
- [ ] LangChain 모듈이 NestJS에 통합됨
- [ ] 간단한 프롬프트 실행 테스트 성공

---

### Task 2.2: LangChain Tools 구현

#### What & Why
SQL Executor와 기타 유틸리티 Tool들을 LangChain Tool 형식으로 구현합니다.

#### Tech Spec
- LangChain Tool interface
- Tool Schema: Zod validation
- TypeORM integration

#### How

1. `src/agents/tools/sql-executor.tool.ts` 생성:
```typescript
import { Tool } from 'langchain/tools';
import { DataSource } from 'typeorm';
import { z } from 'zod';

const sqlExecutorSchema = z.object({
  sql: z.string().describe('MySQL SELECT query to execute'),
});

export class SQLExecutorTool extends Tool {
  name = 'sql_executor';
  description = `Execute a MySQL SELECT query and return results.
    Input should be a valid MySQL query string.
    Only SELECT queries are allowed.`;

  schema = sqlExecutorSchema;

  constructor(private dataSource: DataSource) {
    super();
  }

  async _call(input: string): Promise<string> {
    try {
      const { sql } = sqlExecutorSchema.parse({ sql: input });

      // Validate SQL
      this.validateSQL(sql);

      // Execute query
      const results = await this.dataSource.query(sql);

      return JSON.stringify({
        success: true,
        rowCount: results.length,
        data: results.slice(0, 100), // Limit to 100 rows for context
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error.message,
      });
    }
  }

  private validateSQL(sql: string): void {
    const lowerSQL = sql.toLowerCase().trim();

    if (!lowerSQL.startsWith('select')) {
      throw new Error('Only SELECT queries allowed');
    }

    const forbidden = ['drop', 'delete', 'truncate', 'alter', 'create', 'insert', 'update'];
    for (const keyword of forbidden) {
      if (lowerSQL.includes(keyword)) {
        throw new Error(`Forbidden operation: ${keyword}`);
      }
    }
  }
}
```

2. `src/agents/tools/calculator.tool.ts` (분석용):
```typescript
import { Tool } from 'langchain/tools';
import { z } from 'zod';

const calculatorSchema = z.object({
  operation: z.string().describe('Mathematical operation to perform'),
});

export class CalculatorTool extends Tool {
  name = 'calculator';
  description = 'Perform mathematical calculations for data analysis';
  schema = calculatorSchema;

  async _call(input: string): Promise<string> {
    try {
      // Safe eval alternative using Function
      const result = Function(`'use strict'; return (${input})`)();
      return JSON.stringify({ result });
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  }
}
```

#### Acceptance Criteria
- [ ] SQLExecutorTool이 SQL을 실행하고 결과 반환
- [ ] Tool Schema validation 작동
- [ ] 위험한 SQL 작업 차단
- [ ] CalculatorTool로 간단한 계산 가능

---

### Task 2.3: LangGraph State 정의

#### What & Why
Agent 간 데이터를 전달하고 워크플로우 상태를 관리하기 위한 State Schema를 정의합니다.

#### Tech Spec
- LangGraph StateGraph
- TypeScript Interface + Zod Schema
- JSON Serializable

#### How

1. `src/agents/types/agent-state.ts` 생성:
```typescript
import { z } from 'zod';

export const AgentStateSchema = z.object({
  // User input
  userQuery: z.string(),

  // Workflow control
  currentStep: z.enum(['routing', 'sql_generation', 'sql_execution', 'summarization', 'completed']),
  queryType: z.enum(['simple_query', 'analysis', 'comparison']).optional(),

  // SQL Generation
  generatedSQL: z.string().optional(),
  sqlError: z.string().optional(),

  // SQL Execution
  queryResults: z.any().optional(),
  executionError: z.string().optional(),

  // Summarization
  summary: z.string().optional(),
  insights: z.array(z.string()).optional(),

  // Metadata
  startTime: z.number(),
  endTime: z.number().optional(),
  retryCount: z.number().default(0),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

export const createInitialState = (userQuery: string): AgentState => ({
  userQuery,
  currentStep: 'routing',
  startTime: Date.now(),
  retryCount: 0,
});
```

#### Acceptance Criteria
- [ ] AgentState 타입이 정의됨
- [ ] State Schema가 JSON serializable함
- [ ] 초기 State 생성 함수 작동
- [ ] State validation 통과

---

### Task 2.4: Text-to-SQL Agent 구현

#### What & Why
LangChain Agent로 Text-to-SQL 기능을 구현하여 자연어를 SQL로 변환합니다.

#### Tech Spec
- LangChain Agent with Tools
- Few-shot prompting
- SQL validation

#### How

1. `src/agents/text-to-sql.agent.ts` 생성:
```typescript
import { ChatPromptTemplate } from 'langchain/prompts';
import { createBedrockChatModel } from './config/langchain.config';
import { DB_SCHEMA } from './prompts/schema';

export class TextToSQLAgent {
  private model = createBedrockChatModel();

  private prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are an expert MySQL query generator for the NDMarket database.

Database Schema:
{schema}

Rules:
1. Generate ONLY valid MySQL 8.0 syntax
2. Use appropriate JOINs based on relationships
3. Include LIMIT clause (max 1000 rows)
4. Return ONLY the SQL query, no explanations
5. For comparison queries, use subqueries or CTEs

Examples:
Q: "지난주 신규 입점 마켓 수는?"
A: SELECT COUNT(*) FROM market WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY);

Q: "평균 상품 수가 가장 많은 지역은?"
A: SELECT region, AVG(product_count) as avg_products FROM market GROUP BY region ORDER BY avg_products DESC LIMIT 1;
`],
    ['human', '{query}'],
  ]);

  async generateSQL(userQuery: string): Promise<string> {
    const chain = this.prompt.pipe(this.model);

    const response = await chain.invoke({
      schema: DB_SCHEMA,
      query: userQuery,
    });

    return this.cleanSQL(response.content as string);
  }

  private cleanSQL(sql: string): string {
    return sql
      .replace(/```sql\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
  }
}
```

#### Acceptance Criteria
- [ ] 자연어 질의를 SQL로 변환 성공
- [ ] 복잡한 JOIN 쿼리 생성 가능
- [ ] Few-shot examples가 작동함
- [ ] SQL 정확도 80% 이상

---

### Task 2.5: Insight Summarizer Agent 구현

#### What & Why
SQL 결과를 분석하여 자연어 요약과 인사이트를 생성합니다.

#### Tech Spec
- LangChain PromptTemplate
- Result analysis
- Insight extraction

#### How

1. `src/agents/insight-summarizer.agent.ts` 생성:
```typescript
import { ChatPromptTemplate } from 'langchain/prompts';
import { createBedrockChatModel } from './config/langchain.config';

interface SummaryInput {
  userQuery: string;
  sql: string;
  results: any[];
}

export class InsightSummarizerAgent {
  private model = createBedrockChatModel();

  private prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a data analyst expert. Analyze SQL query results and provide insights in Korean.

Your tasks:
1. Summarize the results in 2-3 sentences
2. Extract key insights (trends, anomalies, comparisons)
3. Provide actionable recommendations if applicable

Format your response as JSON:
{{
  "summary": "결과 요약",
  "insights": ["인사이트 1", "인사이트 2"],
  "recommendations": ["권장사항 1", "권장사항 2"]
}}
`],
    ['human', `User Question: {userQuery}

SQL Query: {sql}

Results (showing first 10 rows):
{results}

Analyze and provide insights:`],
  ]);

  async summarize({ userQuery, sql, results }: SummaryInput): Promise<any> {
    const chain = this.prompt.pipe(this.model);

    const response = await chain.invoke({
      userQuery,
      sql,
      results: JSON.stringify(results.slice(0, 10), null, 2),
    });

    try {
      const content = response.content as string;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: content };
    } catch {
      return { summary: response.content };
    }
  }
}
```

#### Acceptance Criteria
- [ ] SQL 결과를 자연어로 요약
- [ ] 주요 인사이트 추출 (2-3개)
- [ ] JSON 형식으로 반환
- [ ] 한국어 요약 생성

---

### Task 2.6: LangGraph 워크플로우 구성

#### What & Why
LangGraph StateGraph를 사용하여 Agent들을 연결하고 상태 기반 워크플로우를 구성합니다.

#### Tech Spec
- LangGraph StateGraph
- Conditional Edges
- Error handling & retry

#### How

1. `src/agents/workflow/query-workflow.ts` 생성:
```typescript
import { StateGraph, END } from '@langchain/langgraph';
import { AgentState, createInitialState } from '../types/agent-state';
import { TextToSQLAgent } from '../text-to-sql.agent';
import { InsightSummarizerAgent } from '../insight-summarizer.agent';
import { SQLExecutorTool } from '../tools/sql-executor.tool';

export class QueryWorkflow {
  private graph: StateGraph<AgentState>;
  private textToSQLAgent: TextToSQLAgent;
  private summarizerAgent: InsightSummarizerAgent;
  private sqlExecutor: SQLExecutorTool;

  constructor(sqlExecutor: SQLExecutorTool) {
    this.textToSQLAgent = new TextToSQLAgent();
    this.summarizerAgent = new InsightSummarizerAgent();
    this.sqlExecutor = sqlExecutor;

    this.graph = this.buildGraph();
  }

  private buildGraph(): StateGraph<AgentState> {
    const workflow = new StateGraph<AgentState>({
      channels: {
        userQuery: null,
        currentStep: null,
        queryType: null,
        generatedSQL: null,
        sqlError: null,
        queryResults: null,
        executionError: null,
        summary: null,
        insights: null,
        startTime: null,
        endTime: null,
        retryCount: null,
      },
    });

    // Nodes
    workflow.addNode('route_query', this.routeQuery.bind(this));
    workflow.addNode('generate_sql', this.generateSQL.bind(this));
    workflow.addNode('execute_sql', this.executeSQL.bind(this));
    workflow.addNode('summarize', this.summarize.bind(this));

    // Edges
    workflow.setEntryPoint('route_query');

    workflow.addEdge('route_query', 'generate_sql');
    workflow.addEdge('generate_sql', 'execute_sql');

    workflow.addConditionalEdges(
      'execute_sql',
      this.shouldRetry.bind(this),
      {
        retry: 'generate_sql',
        continue: 'summarize',
        end: END,
      },
    );

    workflow.addEdge('summarize', END);

    return workflow;
  }

  private async routeQuery(state: AgentState): Promise<Partial<AgentState>> {
    // Simple routing logic
    const query = state.userQuery.toLowerCase();

    let queryType: AgentState['queryType'] = 'simple_query';
    if (query.includes('분석') || query.includes('비교')) {
      queryType = 'analysis';
    } else if (query.includes('대비') || query.includes('증가')) {
      queryType = 'comparison';
    }

    return {
      currentStep: 'sql_generation',
      queryType,
    };
  }

  private async generateSQL(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const sql = await this.textToSQLAgent.generateSQL(state.userQuery);

      return {
        currentStep: 'sql_execution',
        generatedSQL: sql,
        sqlError: undefined,
      };
    } catch (error) {
      return {
        sqlError: error.message,
      };
    }
  }

  private async executeSQL(state: AgentState): Promise<Partial<AgentState>> {
    try {
      const result = await this.sqlExecutor._call(state.generatedSQL);
      const parsed = JSON.parse(result);

      if (!parsed.success) {
        throw new Error(parsed.error);
      }

      return {
        currentStep: 'summarization',
        queryResults: parsed.data,
        executionError: undefined,
      };
    } catch (error) {
      return {
        executionError: error.message,
        retryCount: state.retryCount + 1,
      };
    }
  }

  private async summarize(state: AgentState): Promise<Partial<AgentState>> {
    const summary = await this.summarizerAgent.summarize({
      userQuery: state.userQuery,
      sql: state.generatedSQL,
      results: state.queryResults,
    });

    return {
      currentStep: 'completed',
      summary: summary.summary,
      insights: summary.insights || [],
      endTime: Date.now(),
    };
  }

  private shouldRetry(state: AgentState): string {
    if (state.executionError && state.retryCount < 2) {
      return 'retry';
    }
    if (state.executionError) {
      return 'end';
    }
    return 'continue';
  }

  async execute(userQuery: string): Promise<AgentState> {
    const initialState = createInitialState(userQuery);
    const compiled = this.graph.compile();

    const result = await compiled.invoke(initialState);
    return result;
  }
}
```

#### Acceptance Criteria
- [ ] StateGraph가 올바르게 구성됨
- [ ] Node 간 전환이 정상 작동
- [ ] Conditional Edge (재시도 로직) 작동
- [ ] 전체 워크플로우 실행 성공
- [ ] 오류 발생 시 재시도 메커니즘 작동

---

### Task 2.7: Agent Service 및 Controller 통합

#### What & Why
LangGraph 워크플로우를 NestJS Service와 Controller에 통합하여 API 엔드포인트로 노출합니다.

#### Tech Spec
- NestJS Service pattern
- DTO validation
- Error handling

#### How

1. `src/agents/dto/agent-query.dto.ts` 생성:
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class AgentQueryRequestDto {
  @IsString()
  @IsNotEmpty()
  query: string;
}

export class AgentQueryResponseDto {
  userQuery: string;
  generatedSQL: string;
  summary: string;
  insights: string[];
  executionTime: number;
  queryResults?: any[];
}
```

2. `src/agents/agent.service.ts` 수정:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QueryWorkflow } from './workflow/query-workflow';
import { SQLExecutorTool } from './tools/sql-executor.tool';
import { AgentQueryResponseDto } from './dto/agent-query.dto';

@Injectable()
export class AgentService {
  private workflow: QueryWorkflow;

  constructor(@InjectDataSource() private dataSource: DataSource) {
    const sqlExecutor = new SQLExecutorTool(dataSource);
    this.workflow = new QueryWorkflow(sqlExecutor);
  }

  async processQuery(query: string): Promise<AgentQueryResponseDto> {
    const result = await this.workflow.execute(query);

    return {
      userQuery: result.userQuery,
      generatedSQL: result.generatedSQL,
      summary: result.summary,
      insights: result.insights || [],
      executionTime: result.endTime - result.startTime,
      queryResults: result.queryResults?.slice(0, 10), // First 10 rows
    };
  }
}
```

3. `src/agents/agent.controller.ts` 생성:
```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentQueryRequestDto, AgentQueryResponseDto } from './dto/agent-query.dto';

@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('query')
  async processQuery(@Body() dto: AgentQueryRequestDto): Promise<AgentQueryResponseDto> {
    return this.agentService.processQuery(dto.query);
  }
}
```

#### Acceptance Criteria
- [ ] POST `/agents/query` 엔드포인트 작동
- [ ] 자연어 질의 → Agent 워크플로우 → 인사이트 반환 완성
- [ ] DTO validation 작동
- [ ] 에러 발생 시 적절한 HTTP 상태 코드
- [ ] API 응답에 실행 시간 포함

---

## ✅ Phase 완료 기준

- [ ] LangChain 및 LangGraph가 NestJS에 통합됨
- [ ] Text-to-SQL Agent 작동 (자연어 → SQL 변환)
- [ ] SQLExecutorTool로 SQL 실행 가능
- [ ] Insight Summarizer Agent로 결과 요약 가능
- [ ] LangGraph StateGraph 워크플로우 완성
- [ ] Agent 간 상태 전달 및 협업 작동
- [ ] 재시도 메커니즘 (최대 2회) 작동
- [ ] POST `/agents/query` API 엔드포인트 완성
- [ ] 복잡한 질의 (비교, 분석) 처리 가능
- [ ] 전체 파이프라인 실행 시간 <10초

## 🚀 다음 단계

Phase 2 완료 후 [Phase 3: Vector Search](./03-Vector-Search.md)로 진행하여 의미 기반 검색 기능을 추가합니다.
