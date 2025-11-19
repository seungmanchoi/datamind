# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

NDMarket AI Insight Platform - GCP Cloud SQL(MySQL)과 AWS 생성형 AI 인프라(Bedrock, OpenSearch, LangChain, LangGraph)를 연동한 자연어 기반 데이터 인사이트 시스템

**핵심 아키텍처**: Text-to-SQL + Embedding 기반 Multi-Agent 구조

## 기술 스택

- **Backend**: NestJS + TypeScript
- **ORM**: TypeORM
- **AI Orchestration**: LangChain + LangGraph
- **LLM**: Amazon Bedrock (Claude 3 Sonnet/Haiku, Titan Embeddings)
- **Vector DB**: Amazon OpenSearch Serverless
- **Database**: GCP Cloud SQL (MySQL)
- **IaC**: Terraform
- **Package Manager**: pnpm 또는 yarn

## 개발 명령어

### 개발 모드 (Development)

개발 환경에서는 백엔드(3000)와 프론트엔드(5173)를 별도 포트로 실행:

```bash
# 백엔드 + 프론트엔드 동시 실행 (권장)
pnpm dev

# 또는 개별 실행 (디버깅 시)
pnpm run start:dev        # 백엔드만 (포트 3000)
pnpm run dev:frontend     # 프론트엔드만 (포트 5173)
```

**접속 URL**:
- 백엔드 API: http://localhost:3000
- 프론트엔드: http://localhost:5173 (Vite Dev Server - HMR 지원)

### 프로덕션 모드 (Production)

프로덕션 환경에서는 통합 포트(3000)로 운영:

```bash
# 의존성 설치
pnpm install

# 프론트엔드 + 백엔드 빌드
pnpm run build:all

# 프로덕션 서버 실행
pnpm run start:prod
```

**접속 URL**:
- 통합 서버: http://localhost:3000 (백엔드 + 프론트엔드)

### 기타 명령어

```bash
# 테스트
pnpm run test

# 린트
pnpm run lint

# 포매팅
pnpm run format
```

## 프론트엔드-백엔드 통합 구조

### 포트 운영 방식

#### 개발 모드 (Development)
- **백엔드**: NestJS 서버가 포트 3000에서 API만 제공
- **프론트엔드**: Vite Dev Server가 포트 5173에서 실행 (HMR 지원)
- **프록시**: Vite가 `/api/*`, `/agent/*`, `/search/*`, `/indexing/*` 요청을 백엔드(3000)로 프록시

```typescript
// frontend/vite.config.ts
server: {
  port: 5173,
  proxy: {
    '/api': 'http://localhost:3000',
    '/agent': 'http://localhost:3000',
    // ...
  }
}
```

#### 프로덕션 모드 (Production)
- **통합 포트**: NestJS 서버가 포트 3000에서 백엔드 + 프론트엔드 모두 제공
- **정적 파일 서빙**: `@nestjs/serve-static`이 빌드된 프론트엔드(`frontend/dist`)를 제공
- **라우팅 분리**:
  - API 경로: `/api/*`, `/agent/*`, `/search/*`, `/indexing/*`
  - 프론트엔드: `/*` (나머지 모든 경로)

```typescript
// src/app.module.ts
ServeStaticModule.forRoot({
  rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
  exclude: ['/api*', '/agent*', '/search*', '/indexing*'],
})
```

### 환경 변수

#### 프론트엔드 환경 변수
- **개발**: `frontend/.env.development`
- **프로덕션**: `frontend/.env.production`

```env
VITE_API_URL=http://localhost:3000
```

## 아키텍처 구조

### Multi-Agent System

```
User Query
  ↓
[Text-to-SQL Agent] → SQL 생성 (Bedrock Claude)
  ↓
[SQL Executor] → GCP Cloud SQL 쿼리 실행
  ↓
[Insight Summarizer] → 결과 요약 (Bedrock Claude)
  ↓
[Embedding Retriever] → 의미 기반 검색 (Titan Embeddings + OpenSearch)
  ↓
Response
```

### Agent 역할

1. **Text-to-SQL Agent**
   - 자연어 질의를 SQL로 변환
   - LangChain SQLChainValidator로 SQL 검증
   - TypeORM을 통해 MySQL 쿼리 실행

2. **Insight Summarizer Agent**
   - SQL 결과를 자연어로 요약
   - 비교 분석 및 이상치 탐지
   - LangGraph 워크플로우 내 자동 연결

3. **Embedding & Semantic Search Agent**
   - 상품/옵션/매장 텍스트 데이터 벡터화
   - OpenSearch Serverless 저장/검색
   - 의미 기반 유사도 검색

4. **LangGraph Orchestration**
   - Agent 간 상태 기반 워크플로우 관리
   - Conditional Branch / Retry / Multi-Agent Delegation

### 디렉토리 구조 (예정)

```
datamind/
├── src/
│   ├── agents/           # LangChain/LangGraph Agent 구현
│   ├── modules/          # NestJS 모듈 (서비스, 컨트롤러)
│   ├── database/         # TypeORM 엔티티, 마이그레이션
│   ├── common/           # 공통 유틸리티, 인터셉터
│   └── config/           # 환경 설정
├── terraform/            # AWS/GCP 인프라 코드
│   ├── vpc/
│   ├── iam/
│   ├── opensearch/
│   └── monitoring/
├── test/                 # 테스트 코드
└── docs/                 # 문서
```

## NestJS 아키텍처 패턴

모든 모듈은 표준 NestJS 레이어드 아키텍처를 따름:
- **Controller**: 요청/응답 처리
- **Service**: 비즈니스 로직 (Agent 호출, 워크플로우 관리)
- **Repository**: 데이터 접근 (TypeORM)
- **Mapper**: Entity ↔ DTO 변환

### 타입 안정성

- `any` 타입 사용 금지
- 모든 함수 파라미터, 반환 타입 명시
- DTO에 class-validator 데코레이터 사용
- Mapper를 통한 API 응답 처리 (Raw Entity 노출 금지)

## 멀티 클라우드 연결

### 개발 환경
- Cloud SQL Public IP + SSL
- `.env`에 DB 연결 정보 설정

### 프로덕션 환경
- GCP ↔ AWS VPC Peering or Private Service Connect
- Cloud SQL Private IP 모드
- AWS Secrets Manager로 자격 증명 관리
- SSL/TLS 강제

## AI/LLM 통합

### Bedrock 통합
- AWS SDK로 Bedrock Runtime 접근
- Model ID: `anthropic.claude-3-sonnet-v1`, `anthropic.claude-3-haiku-v1`
- Titan Embeddings: `amazon.titan-embed-text-v1`

### LangChain/LangGraph
- Agent 체인 구성: Sequential / Parallel / Conditional
- State Management: Query Context, DB Results, Session Data
- Tool Integration: SQL Executor, Vector Search, Summarizer

### OpenSearch
- Serverless Collection 생성
- k-NN 벡터 검색 설정
- 인덱스 매핑: 상품, 옵션, 매장 메타데이터

## Terraform 인프라

### 모듈 구성
- `vpc/`: AWS VPC, Subnet, Gateway
- `iam/`: Agent별 IAM Role, Bedrock Access Policy
- `opensearch/`: OpenSearch Serverless Domain
- `monitoring/`: CloudWatch Logs + Alarm

### 배포 워크플로우
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## MVP 구현 단계

1. **1단계**: Cloud SQL + Bedrock 연결, Text-to-SQL 기본 질의
2. **2단계**: LangChain + LangGraph Agent 구성, 다단계 파이프라인
3. **3단계**: OpenSearch Embedding 연동, 의미 기반 검색
4. **4단계**: 관리자 대시보드 MVP (QuickSight/Streamlit)
5. **5단계**: Terraform IaC 적용, CI/CD 연동

## 보안 고려사항

- DB Credentials → AWS Secrets Manager
- Agent별 최소 권한 IAM Policy
- Cross-Cloud 통신 SSL/TLS 강제
- API Key, Token 등 민감 정보 코드/커밋에서 제외

## 코드 품질

작업 완료 시 자동으로 수행:
- ESLint 오류 체크
- Prettier 코드 포매팅
- `@` alias import 경로 사용 확인

## Git 워크플로우

- 커밋 메시지에 `Co-Authored-By: Claude <noreply@anthropic.com>` 포함하지 않음
- 커밋 전 린트/타입 체크 완료
- 의미있는 커밋 메시지 작성 (why, not what)
