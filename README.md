# NDMarket AI Insight Platform

> GCP Cloud SQL(MySQL)과 AWS 생성형 AI 인프라(Bedrock, OpenSearch, LangChain, LangGraph)를 연동한 자연어 기반 데이터 인사이트 시스템

[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock-FF9900?logo=amazon-aws)](https://aws.amazon.com/bedrock/)
[![Next.js](https://img.shields.io/badge/Next.js-14.x-000000?logo=next.js)](https://nextjs.org/)

## 📋 목차

- [프로젝트 개요](#-프로젝트-개요)
- [핵심 기능](#-핵심-기능)
- [아키텍처](#-아키텍처)
- [기술 스택](#-기술-스택)
- [시작하기](#-시작하기)
- [개발 로드맵](#-개발-로드맵)
- [API 문서](#-api-문서)
- [프로젝트 구조](#-프로젝트-구조)

---

## 🎯 프로젝트 개요

**NDMarket AI Insight Platform**은 자연어 질의를 통해 복잡한 데이터베이스 분석을 자동화하는 차세대 BI(Business Intelligence) 플랫폼입니다.

### 핵심 가치 제안

- **자연어 기반 데이터 분석**: "최근 일주일간 가장 많이 팔린 상품 10개를 보여줘" → SQL 자동 생성 및 실행
- **AI 기반 인사이트 도출**: MySQL MCP를 통해 Claude가 직접 DB를 분석하고 비즈니스 인사이트 제공
- **실시간 데이터 시각화**: 차트, 테이블, 대시보드를 통한 직관적인 데이터 이해
- **Multi-Agent 시스템**: LangChain/LangGraph 기반 분산 에이전트가 협업하여 복잡한 분석 수행

---

## ✨ 핵심 기능

### 1. Text-to-SQL Engine
```
사용자: "지난 달 매출 TOP 10 상품은?"
  ↓
AI (Claude 3 Sonnet): SQL 쿼리 자동 생성
  ↓
MySQL: 쿼리 실행 및 결과 반환
  ↓
Frontend: Bar Chart로 시각화
```

### 2. AI Insights (MySQL MCP 활용)
- **자동 인사이트**: "목요일 매출이 평균 대비 35% 급증"
- **이상치 탐지**: "23시 주문 취소율 45% 급증 (평균 5%)"
- **추천 액션**: "전자제품 재고 확보 필요"
- **관련 쿼리 제안**: "신규 고객 평균 구매 금액은?"

### 3. Multi-Agent System
- **Text-to-SQL Agent**: 자연어 → SQL 변환
- **Insight Summarizer**: 결과 요약 및 인사이트 도출
- **Embedding & Search Agent**: 의미 기반 유사 검색
- **LangGraph Orchestrator**: 에이전트 간 워크플로우 관리

### 4. 실시간 대시보드
- 드래그 앤 드롭 위젯 배치
- WebSocket 기반 실시간 데이터 업데이트
- 커스텀 차트 (Line, Bar, Pie, Table, Heatmap)
- 즐겨찾기 쿼리 저장 및 자동 실행

---

## 🏗️ 아키텍처

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Query Input  │  │ Chart Viewer │  │  Dashboard   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │ REST API / WebSocket
┌─────────────────────────────┼─────────────────────────────────┐
│              Backend (NestJS + LangChain/LangGraph)           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Multi-Agent Orchestrator                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │ Text-to-SQL │→ │SQL Executor │→ │ Summarizer  │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                                                        │  │
│  │  ┌─────────────┐                                      │  │
│  │  │  Embedding  │ ← OpenSearch Serverless              │  │
│  │  └─────────────┘                                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                             │                                 │
│  ┌──────────────────────────┼──────────────────────────┐    │
│  │        AWS Bedrock       │      MySQL MCP           │    │
│  │  ┌──────────────────┐    │   ┌──────────────────┐  │    │
│  │  │ Claude 3 Sonnet  │    │   │  Direct DB Query │  │    │
│  │  │ Titan Embeddings │    │   │  AI Insights     │  │    │
│  │  └──────────────────┘    │   └──────────────────┘  │    │
│  └──────────────────────────┴──────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┴─────────────────────────────────┐
│                   GCP Cloud SQL (MySQL)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Products │  │  Orders  │  │Customers │  │  Stores  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└───────────────────────────────────────────────────────────────┘
```

### Layered Architecture (Backend)

```
┌─────────────────────────────────────────────────────────┐
│                    Controller Layer                     │
│  - HTTP 요청/응답 처리                                    │
│  - DTO 검증 (class-validator)                           │
│  - Mapper를 통한 응답 변환                               │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                    Service Layer                        │
│  - 비즈니스 로직 처리                                     │
│  - AI 호출 (Bedrock, LangChain)                         │
│  - SQL 검증 및 실행 오케스트레이션                        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                  Repository Layer                       │
│  - 데이터베이스 직접 접근                                 │
│  - 스키마 정보 조회 및 캐싱                               │
│  - Raw SQL 실행                                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                   Database (MySQL)                      │
│  - GCP Cloud SQL                                        │
│  - TypeORM으로 연결 관리                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ 기술 스택

### Backend
- **Framework**: NestJS 10.x (Node.js)
- **Language**: TypeScript 5.x
- **ORM**: TypeORM
- **Database**: GCP Cloud SQL (MySQL)
- **AI/LLM**:
  - AWS Bedrock (Claude 3 Sonnet/Haiku)
  - Amazon Titan Embeddings
  - LangChain + LangGraph
- **Vector DB**: Amazon OpenSearch Serverless
- **Secrets**: AWS Secrets Manager
- **Package Manager**: pnpm

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts + Chart.js
- **Tables**: TanStack Table
- **State**: Zustand / TanStack Query
- **Real-time**: Socket.io-client

### Infrastructure
- **IaC**: Terraform
- **Monitoring**: CloudWatch
- **CI/CD**: GitHub Actions

---

## 🚀 시작하기

### 사전 요구사항

```bash
# Node.js v22.11.0 (nvm 권장)
nvm use

# pnpm 설치
npm install -g pnpm
```

### 설치

```bash
# 1. 저장소 클론
git clone git@github.com:seungmanchoi/datamind.git
cd datamind

# 2. 의존성 설치
pnpm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어서 다음 값들을 설정:
# - DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME
# - AWS_REGION, BEDROCK_MODEL_ID
```

### 실행

```bash
# 개발 서버 시작 (Watch 모드)
pnpm run start:dev

# 프로덕션 빌드
pnpm run build

# 프로덕션 서버 실행
pnpm run start:prod
```

서버가 시작되면 `http://localhost:3000`에서 접근 가능합니다.

### API 테스트

```bash
# Health Check
curl http://localhost:3000/health

# 자연어 쿼리 (예시)
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "최근 일주일간 가장 많이 팔린 상품 10개를 보여줘"}'
```

---

## 📚 개발 로드맵

프로젝트는 6개의 Phase로 구성되며, 각 Phase는 6일 이내에 완료할 수 있도록 설계되었습니다.

### ✅ Phase 1: Foundation (완료)
**기간**: 6일 | **상태**: ✅ 완료

- [x] NestJS 프로젝트 초기 설정
- [x] GCP Cloud SQL (MySQL) 연결
- [x] AWS Secrets Manager 통합
- [x] AWS Bedrock Claude 3 연동
- [x] Text-to-SQL 프롬프트 엔지니어링
- [x] Query API 구현 (Layered Architecture)

**주요 API**:
- `POST /query` - 자연어 쿼리 실행

---

### ✅ Phase 2: Multi-Agent System (완료)
**기간**: 6일 | **상태**: ✅ 완료

- [x] LangChain 통합 (BedrockChat, Tools)
- [x] LangGraph 워크플로우 설계 (StateGraph)
- [x] Text-to-SQL Agent 구현 (Few-Shot Learning)
- [x] Insight Summarizer Agent 구현
- [x] Agent 간 상태 관리 및 통신 (AgentState)
- [x] Multi-step 쿼리 처리 (Node 기반 파이프라인)
- [x] 에러 핸들링 및 Retry 로직
- [x] **Few-Shot 예제 기반 SQL 생성 (10개 샘플 쿼리)**

**주요 API**:
- `POST /agents/insight` - 데이터 인사이트 워크플로우 실행
- `POST /agents/test` - Agent 프롬프트 테스트

**Few-Shot Learning**:
- 실제 NDMarket 데이터베이스 기반 10개 샘플 쿼리
- 키워드 기반 관련 예제 자동 선택
- 자세한 내용: [docs/fewshot-examples.md](./docs/fewshot-examples.md)

**상세 가이드**: [docs/phases/02-Agent-System.md](./docs/phases/02-Agent-System.md)

---

### ✅ Phase 3: Vector Search & Embeddings
**기간**: 6일 | **상태**: ✅ 완료

- [x] Amazon Titan Embeddings 연동 (EmbeddingsService)
- [x] OpenSearch Serverless 구성 및 k-NN 인덱스 설정
- [x] 상품 데이터 벡터화 및 인덱싱 파이프라인
- [x] 의미 기반 검색 API 구현 (SemanticSearchService)
- [x] Hybrid Search (벡터 + 키워드)
- [x] Router Agent를 통한 자동 쿼리 타입 선택 (SQL vs Semantic)
- [x] LangGraph 워크플로우에 Semantic Search 통합

**주요 API**:
- `POST /indexing/products` - 전체 상품 벡터 인덱싱
- `POST /indexing/products/:id` - 특정 상품 재인덱싱
- `GET /search/semantic?q=query&k=10` - 의미 기반 검색
- `GET /search/hybrid?q=query&k=10` - 하이브리드 검색
- `GET /search/similar/:id?k=10` - 유사 상품 검색

**워크플로우 개선**:
- Router Node가 질의 분석하여 SQL vs Semantic Search 자동 선택
- Semantic Search 키워드 감지: "같은", "유사한", "비슷한", "추천", "찾아줘" 등
- 양방향 경로: Text-to-SQL → SQL Executor 또는 Semantic Search → Insight Summarizer

**상세 가이드**: [docs/phases/03-Vector-Search.md](./docs/phases/03-Vector-Search.md)

---

### 🔄 Phase 4: Streamlit Dashboard (Admin)
**기간**: 6일 | **상태**: 🔜 예정

- [ ] Streamlit 앱 설정
- [ ] 자연어 쿼리 UI
- [ ] 쿼리 결과 시각화 (Plotly)
- [ ] Agent 실행 로그 대시보드
- [ ] 성능 모니터링 대시보드
- [ ] A/B 테스트 결과 뷰어

**상세 가이드**: [docs/phases/04-Dashboard.md](./docs/phases/04-Dashboard.md)

---

### 🔄 Phase 5: Infrastructure & CI/CD
**기간**: 6일 | **상태**: 🔜 예정

- [ ] Terraform으로 AWS 인프라 정의
- [ ] VPC, IAM, OpenSearch 모듈화
- [ ] CloudWatch 모니터링 설정
- [ ] GitHub Actions CI/CD 파이프라인
- [ ] 환경별 배포 전략 (dev/staging/prod)
- [ ] Repository 구조 결정 (Monorepo vs Multi-repo)

**상세 가이드**: [docs/phases/05-Infrastructure.md](./docs/phases/05-Infrastructure.md)

---

### 🔄 Phase 6: Frontend Dashboard & Data Visualization
**기간**: 6일 | **상태**: 🔜 예정

- [ ] Next.js 14 App Router 프로젝트 설정
- [ ] 자연어 쿼리 인터페이스
- [ ] 데이터 시각화 (Line, Bar, Pie, Table, Heatmap)
- [ ] 드래그 앤 드롭 대시보드 위젯
- [ ] WebSocket 실시간 데이터 업데이트
- [ ] MySQL MCP 기반 AI Insights
- [ ] 반응형 디자인 및 성능 최적화

**주요 기능**:
- 자연어 → SQL → 차트 자동 시각화
- Claude가 MySQL MCP로 직접 DB 분석
- 이상치 탐지, 트렌드 분석, 추천 액션
- 커스텀 대시보드 구성 및 저장

**상세 가이드**: [docs/phases/06-Frontend-Dashboard.md](./docs/phases/06-Frontend-Dashboard.md)

---

## 📖 API 문서

### Query API

#### `POST /query`
자연어 쿼리를 SQL로 변환하고 실행합니다.

**Request**:
```json
{
  "query": "최근 일주일간 가장 많이 팔린 상품 10개를 보여줘"
}
```

**Response**:
```json
{
  "sql": "SELECT product_name, SUM(quantity) as total_sales FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY product_name ORDER BY total_sales DESC LIMIT 10",
  "data": [
    { "product_name": "상품A", "total_sales": 150 },
    { "product_name": "상품B", "total_sales": 120 }
  ],
  "executionTime": 45,
  "rowCount": 10,
  "timestamp": "2025-11-18T12:00:00.000Z"
}
```

**Error Response**:
```json
{
  "statusCode": 400,
  "message": "SQL validation failed: Only SELECT queries are allowed",
  "error": "Bad Request"
}
```

### Health Check

#### `GET /health`
서버 상태를 확인합니다.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T12:00:00.000Z"
}
```

---

## 📁 프로젝트 구조

```
datamind/
├── src/
│   ├── main.ts                          # 애플리케이션 진입점
│   ├── app.module.ts                    # 루트 모듈
│   ├── app.controller.ts                # Health check
│   │
│   ├── common/                          # 공통 서비스
│   │   ├── secrets.module.ts            # AWS Secrets Manager (Global)
│   │   ├── secrets.service.ts
│   │   └── bedrock.service.ts           # AWS Bedrock Claude 3
│   │
│   ├── modules/
│   │   └── query/                       # Query 모듈 (Layered Architecture)
│   │       ├── dto/
│   │       │   ├── query-request.dto.ts
│   │       │   └── query-response.dto.ts
│   │       ├── query.controller.ts      # POST /query
│   │       ├── query.service.ts         # 비즈니스 로직
│   │       ├── query.repository.ts      # 데이터 접근
│   │       ├── query.mapper.ts          # Entity ↔ DTO
│   │       └── query.module.ts
│   │
│   └── prompts/
│       └── text-to-sql.prompt.ts        # Text-to-SQL 프롬프트 템플릿
│
├── docs/
│   ├── phases/                          # Phase별 개발 가이드
│   │   ├── 00-README.md
│   │   ├── 01-Foundation.md             # ✅ 완료
│   │   ├── 02-Agent-System.md           # 🔜 예정
│   │   ├── 03-Vector-Search.md          # 🔜 예정
│   │   ├── 04-Dashboard.md              # 🔜 예정
│   │   ├── 05-Infrastructure.md         # 🔜 예정
│   │   └── 06-Frontend-Dashboard.md     # 🔜 예정
│   └── datamind.md                      # 프로젝트 상세 문서
│
├── terraform/                           # IaC (Phase 5)
│   ├── vpc/
│   ├── iam/
│   ├── opensearch/
│   └── monitoring/
│
├── .env.example                         # 환경 변수 템플릿
├── .nvmrc                               # Node.js 버전 고정
├── nest-cli.json                        # NestJS CLI 설정
├── tsconfig.json                        # TypeScript 설정
├── package.json
├── pnpm-lock.yaml
├── CLAUDE.md                            # Claude Code 가이드
└── README.md                            # 이 파일
```

---

## 🧪 테스트

```bash
# 단위 테스트
pnpm run test

# E2E 테스트
pnpm run test:e2e

# 테스트 커버리지
pnpm run test:cov
```

---

## 📝 코드 품질

### 린트 및 포맷팅

```bash
# ESLint
pnpm run lint

# Prettier
pnpm run format
```

### 코드 품질 기준
- ✅ TypeScript strict mode
- ✅ No `any` type in production code
- ✅ DTO validation with class-validator
- ✅ Layered Architecture (Controller/Service/Repository/Mapper)
- ✅ Mapper를 통한 응답 처리 (Entity 직접 노출 금지)
- ✅ `@` alias import 사용

---

## 🔒 보안

### 구현된 보안 기능
- ✅ AWS Secrets Manager로 민감 정보 관리
- ✅ SQL Injection 방어 (SELECT만 허용, 위험 패턴 차단)
- ✅ DTO 입력 검증 (class-validator)
- ✅ SSL/TLS 연결 (프로덕션)
- ✅ 환경 변수로 자격 증명 관리

### 추가 예정
- [ ] JWT 기반 API 인증
- [ ] Rate Limiting
- [ ] CORS 정책 설정
- [ ] API Key 관리

---

## 🤝 기여하기

이 프로젝트는 현재 개발 중입니다. 기여를 원하시면 다음 단계를 따라주세요:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 커밋 메시지 규칙
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 기타 변경사항
```

---

## 📄 라이선스

이 프로젝트는 ISC 라이선스를 따릅니다.

---

## 👤 Author

**Seungman Choi** (blueng)
- Email: blueng.choi@gmail.com
- GitHub: [@seungmanchoi](https://github.com/seungmanchoi)

---

## 🙏 Acknowledgments

- **NestJS** - Progressive Node.js framework
- **AWS Bedrock** - Generative AI foundation models
- **LangChain/LangGraph** - LLM application framework
- **Claude 3** - Anthropic's AI assistant
- **Next.js** - React framework for production

---

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.

[Issues](https://github.com/seungmanchoi/datamind/issues)
