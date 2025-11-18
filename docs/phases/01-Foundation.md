# Phase 1: Foundation

## 📋 작업 정의 및 목표 (What & Why)

### What
GCP Cloud SQL(MySQL)과 AWS Bedrock Claude 3를 연결하여 자연어 질의를 SQL로 변환하고 실행하는 기본 파이프라인을 구축합니다.

### Why
- 모든 후속 Phase의 기반이 되는 핵심 인프라 구축
- Text-to-SQL 기능을 통해 비기술 사용자도 데이터 조회 가능
- Cross-cloud 연결 및 보안 설정의 토대 마련

### 달성 결과
- 자연어 질의 → SQL 생성 → DB 쿼리 → 결과 반환 파이프라인 완성
- 개발 및 프로덕션 환경 분리
- 안전한 Secrets 관리 체계 구축

---

## 🔧 기술 스펙 및 제약사항

### 사용 기술 스택
- **Backend**: NestJS 10.x + TypeScript 5.x
- **ORM**: TypeORM 0.3.x
- **LLM**: AWS Bedrock Claude 3 Sonnet (`anthropic.claude-3-sonnet-20240229-v1:0`)
- **Database**: GCP Cloud SQL (MySQL 8.0)
- **AWS SDK**: @aws-sdk/client-bedrock-runtime 3.x
- **Package Manager**: pnpm

### AWS 서비스
- Bedrock Runtime (Claude 3 Sonnet)
- Secrets Manager (DB credentials, API keys 저장)

### GCP 서비스
- Cloud SQL (MySQL 8.0)
- Cloud SQL Proxy (개발 환경)

### 제약사항
- Bedrock는 특정 리전에서만 사용 가능 (us-east-1, us-west-2 등)
- Cloud SQL 연결 시 SSL/TLS 필수
- Bedrock 요청당 최대 토큰: 200K (Claude 3 Sonnet)
- SQL Injection 방지를 위한 쿼리 검증 필수

---

## 📝 Task 목록

### Task 1.1: NestJS 프로젝트 초기 설정

#### What & Why
NestJS 프로젝트 구조를 생성하고 필요한 의존성을 설치합니다. 표준 레이어드 아키텍처(Controller, Service, Repository, Mapper)를 따르는 기반을 만듭니다.

#### Tech Spec
- NestJS CLI: `@nestjs/cli`
- Core dependencies: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`
- Config: `@nestjs/config` (환경 변수 관리)
- TypeORM: `@nestjs/typeorm`, `typeorm`, `mysql2`

#### How
```bash
# NestJS 프로젝트 생성
npx @nestjs/cli new datamind
cd datamind

# 필요한 패키지 설치
pnpm add @nestjs/config @nestjs/typeorm typeorm mysql2
pnpm add @aws-sdk/client-bedrock-runtime @aws-sdk/client-secrets-manager
pnpm add class-validator class-transformer

# 개발 도구 설치
pnpm add -D @types/node
```

디렉토리 구조:
```
src/
├── common/           # 공통 유틸리티, 인터셉터, 데코레이터
├── config/           # 환경 설정 (database.config.ts, aws.config.ts)
├── database/         # TypeORM 엔티티, 마이그레이션
├── modules/
│   └── query/        # Text-to-SQL 모듈
│       ├── dto/
│       ├── query.controller.ts
│       ├── query.service.ts
│       └── query.module.ts
└── main.ts
```

#### Acceptance Criteria
- [ ] NestJS 프로젝트가 생성되고 `pnpm start:dev` 실행 가능
- [ ] 모든 의존성이 설치되고 타입 오류 없음
- [ ] 환경 변수 설정을 위한 `.env.example` 파일 생성
- [ ] ESLint, Prettier 설정 완료

---

### Task 1.2: GCP Cloud SQL 연결 설정

#### What & Why
개발 환경과 프로덕션 환경에서 Cloud SQL에 안전하게 연결할 수 있도록 TypeORM 설정을 구성합니다.

#### Tech Spec
- TypeORM MySQL Driver: `mysql2`
- 개발: Cloud SQL Public IP + SSL
- 프로덕션: Private IP + VPC Peering (Phase 5에서 구현)
- SSL 인증서: GCP에서 다운로드

#### How

1. Cloud SQL 인스턴스 정보 확인:
```bash
# GCP Console에서 확인
Instance connection name: [PROJECT_ID]:[REGION]:[INSTANCE_NAME]
Public IP: 34.xxx.xxx.xxx
```

2. `src/config/database.config.ts` 생성:
```typescript
import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10) || 3306,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development',
  ssl: {
    rejectUnauthorized: true,
  },
  extra: {
    connectionLimit: 10,
  },
}));
```

3. `.env` 파일 설정:
```env
DATABASE_HOST=34.xxx.xxx.xxx
DATABASE_PORT=3306
DATABASE_USER=yhkim
DATABASE_PASSWORD=your_password
DATABASE_NAME=ndmarket
NODE_ENV=development
```

4. `app.module.ts`에 TypeORM 등록:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('database'),
    }),
  ],
})
export class AppModule {}
```

#### Acceptance Criteria
- [ ] Cloud SQL에 성공적으로 연결 가능
- [ ] TypeORM 마이그레이션 실행 가능
- [ ] SSL 인증서 검증 통과
- [ ] 연결 풀링 설정 작동 (max 10 connections)
- [ ] `.env` 파일이 `.gitignore`에 포함됨

---

### Task 1.3: AWS Secrets Manager 통합

#### What & Why
DB credentials와 API keys를 안전하게 저장하고 프로덕션 환경에서 자동으로 로드합니다.

#### Tech Spec
- AWS SDK: `@aws-sdk/client-secrets-manager`
- Secret 이름: `ndmarket/database/credentials`
- IAM Role: Secrets Manager Read 권한 필요

#### How

1. AWS Secrets Manager에 Secret 생성:
```json
{
  "host": "34.xxx.xxx.xxx",
  "port": 3306,
  "username": "yhkim",
  "password": "your_password",
  "database": "ndmarket"
}
```

2. `src/common/secrets.service.ts` 생성:
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

@Injectable()
export class SecretsService implements OnModuleInit {
  private client: SecretsManagerClient;
  private secrets: Record<string, any> = {};

  constructor() {
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'production') {
      await this.loadSecrets();
    }
  }

  private async loadSecrets() {
    const command = new GetSecretValueCommand({
      SecretId: 'ndmarket/database/credentials',
    });

    const response = await this.client.send(command);
    this.secrets = JSON.parse(response.SecretString);
  }

  get(key: string): string {
    return this.secrets[key] || process.env[key];
  }
}
```

3. Database config 수정하여 Secrets Manager 사용:
```typescript
// src/config/database.config.ts
export default registerAs('database', () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    type: 'mysql',
    host: isProduction ? secretsService.get('host') : process.env.DATABASE_HOST,
    // ... 나머지 설정
  };
});
```

#### Acceptance Criteria
- [ ] 개발 환경에서는 `.env` 파일 사용
- [ ] 프로덕션 환경에서는 Secrets Manager에서 자동 로드
- [ ] Secrets Manager 접근 실패 시 적절한 에러 처리
- [ ] IAM Role 기반 인증 작동

---

### Task 1.4: AWS Bedrock Claude 3 연동

#### What & Why
AWS Bedrock을 통해 Claude 3 Sonnet 모델에 접근하여 Text-to-SQL 변환을 수행합니다.

#### Tech Spec
- AWS SDK: `@aws-sdk/client-bedrock-runtime`
- Model ID: `anthropic.claude-3-sonnet-20240229-v1:0`
- Region: `us-east-1` (Bedrock 지원 리전)
- Max tokens: 4096 (SQL 생성용)

#### How

1. `src/common/bedrock.service.ts` 생성:
```typescript
import { Injectable } from '@nestjs/common';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

interface BedrockRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

@Injectable()
export class BedrockService {
  private client: BedrockRuntimeClient;
  private modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  async invokeModel({ prompt, maxTokens = 4096, temperature = 0 }: BedrockRequest): Promise<string> {
    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return responseBody.content[0].text;
  }
}
```

2. 환경 변수 설정:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

#### Acceptance Criteria
- [ ] Bedrock Claude 3 Sonnet 모델 호출 성공
- [ ] 프롬프트를 전송하고 응답을 받을 수 있음
- [ ] 에러 처리 및 재시도 로직 구현
- [ ] IAM 권한 설정 완료 (bedrock:InvokeModel)

---

### Task 1.5: Text-to-SQL 프롬프트 엔지니어링

#### What & Why
자연어 질의를 정확한 MySQL 쿼리로 변환하기 위한 프롬프트 템플릿을 설계합니다.

#### Tech Spec
- 프롬프트 형식: Few-shot learning
- DB 스키마 정보 포함 (테이블, 컬럼, 관계)
- SQL Injection 방지 패턴

#### How

1. `src/modules/query/prompts/text-to-sql.prompt.ts` 생성:
```typescript
export const buildTextToSQLPrompt = (userQuery: string, schema: string): string => {
  return `You are an expert MySQL query generator for the NDMarket database.

Database Schema:
${schema}

Rules:
1. Generate ONLY valid MySQL 8.0 syntax
2. Use parameterized queries (? placeholders) for user inputs
3. Include LIMIT clause to prevent large result sets (max 1000 rows)
4. Use appropriate JOINs based on foreign key relationships
5. Return ONLY the SQL query without explanations

User Question: "${userQuery}"

Generate the SQL query:`;
};

export const DB_SCHEMA = `
Tables:
- market: id, name, region, created_at, updated_at, product_count
- product: id, market_id, name, category, price, stock, created_at
- option: id, product_id, name, additional_price

Relationships:
- market.id ← product.market_id (One-to-Many)
- product.id ← option.product_id (One-to-Many)
`;
```

2. Query Service에서 사용:
```typescript
import { Injectable } from '@nestjs/common';
import { BedrockService } from '@/common/bedrock.service';
import { buildTextToSQLPrompt, DB_SCHEMA } from './prompts/text-to-sql.prompt';

@Injectable()
export class QueryService {
  constructor(private readonly bedrockService: BedrockService) {}

  async generateSQL(userQuery: string): Promise<string> {
    const prompt = buildTextToSQLPrompt(userQuery, DB_SCHEMA);
    const sqlQuery = await this.bedrockService.invokeModel({
      prompt,
      temperature: 0, // Deterministic output
      maxTokens: 2048,
    });

    return this.cleanSQL(sqlQuery);
  }

  private cleanSQL(sql: string): string {
    // Remove markdown code blocks
    return sql.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
  }
}
```

#### Acceptance Criteria
- [ ] 자연어 질의 → SQL 변환 성공률 80% 이상
- [ ] 생성된 SQL이 MySQL 8.0 문법에 맞음
- [ ] LIMIT 절이 자동 포함됨
- [ ] 복잡한 JOIN 쿼리도 정확하게 생성

---

### Task 1.6: SQL 실행 및 결과 반환

#### What & Why
생성된 SQL을 TypeORM을 통해 안전하게 실행하고 결과를 반환합니다.

#### Tech Spec
- TypeORM Raw Query Execution
- SQL Validation (간단한 검증)
- 결과 DTO 매핑

#### How

1. `src/modules/query/dto/query.dto.ts` 생성:
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class QueryRequestDto {
  @IsString()
  @IsNotEmpty()
  query: string;
}

export class QueryResponseDto {
  sql: string;
  results: any[];
  rowCount: number;
  executionTime: number;
}
```

2. Query Service에 실행 로직 추가:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class QueryService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private readonly bedrockService: BedrockService,
  ) {}

  async executeQuery(userQuery: string): Promise<QueryResponseDto> {
    const startTime = Date.now();

    // Step 1: Generate SQL
    const sql = await this.generateSQL(userQuery);

    // Step 2: Validate SQL (basic checks)
    this.validateSQL(sql);

    // Step 3: Execute SQL
    const results = await this.dataSource.query(sql);

    const executionTime = Date.now() - startTime;

    return {
      sql,
      results,
      rowCount: results.length,
      executionTime,
    };
  }

  private validateSQL(sql: string): void {
    const lowerSQL = sql.toLowerCase();

    // Prevent dangerous operations
    const forbidden = ['drop', 'delete', 'truncate', 'alter', 'create', 'insert', 'update'];
    for (const keyword of forbidden) {
      if (lowerSQL.includes(keyword)) {
        throw new Error(`Forbidden SQL operation: ${keyword}`);
      }
    }

    // Must be SELECT query
    if (!lowerSQL.startsWith('select')) {
      throw new Error('Only SELECT queries are allowed');
    }
  }
}
```

3. Controller 구현:
```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { QueryService } from './query.service';
import { QueryRequestDto, QueryResponseDto } from './dto/query.dto';

@Controller('query')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post()
  async executeQuery(@Body() dto: QueryRequestDto): Promise<QueryResponseDto> {
    return this.queryService.executeQuery(dto.query);
  }
}
```

#### Acceptance Criteria
- [ ] POST `/query` 엔드포인트 작동
- [ ] 자연어 질의 → SQL 생성 → 실행 → 결과 반환 파이프라인 완성
- [ ] 위험한 SQL 키워드(DROP, DELETE 등) 차단
- [ ] SELECT 쿼리만 허용
- [ ] 실행 시간 측정 및 반환
- [ ] 에러 발생 시 적절한 HTTP 상태 코드 반환

---

## ✅ Phase 완료 기준

- [ ] NestJS 프로젝트 구조 완성 및 실행 가능
- [ ] GCP Cloud SQL 연결 성공 (개발 환경)
- [ ] AWS Secrets Manager 통합 완료
- [ ] AWS Bedrock Claude 3 모델 호출 성공
- [ ] 자연어 → SQL 변환 기능 작동 (80% 이상 정확도)
- [ ] SQL 실행 및 결과 반환 파이프라인 완성
- [ ] 기본 보안 검증 (SQL Injection 방지, 읽기 전용)
- [ ] 모든 환경 변수가 `.env.example`에 문서화됨
- [ ] Secrets가 코드에 하드코딩되지 않음
- [ ] API 엔드포인트 테스트 성공

## 🚀 다음 단계

Phase 1 완료 후 [Phase 2: Agent System](./02-Agent-System.md)으로 진행하여 LangChain/LangGraph 기반 Multi-Agent 시스템을 구축합니다.
