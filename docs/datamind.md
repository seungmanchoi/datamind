
---

```markdown
# 🧠 NDMarket AI Insight Platform - MVP Technical Overview

## 📘 Project Summary

이 프로젝트는 **GCP Cloud SQL(MySQL)** 에 저장된 비즈니스 데이터를  
**AWS 기반의 생성형 AI 인프라(Amazon Bedrock, OpenSearch, LangChain, LangGraph)** 와 연동하여  
내부 관리자·마케팅팀이 **자연어 질의로 데이터 인사이트를 얻을 수 있는 시스템**을 구축하는 것을 목표로 합니다.

핵심은 **Text-to-SQL + Embedding 기반 데이터 검색/분석 에이전트 구조**로,  
각 Agent가 독립적 역할을 수행하면서 협업하여 복잡한 질의 응답과 분석 결과를 제공합니다.

---

## 🏗️ System Architecture Overview

```

[Admin User]
↓
[Frontend / Admin Console]
↓
[NestJS Backend (LangChain + LangGraph Agent Layer)]
├── Text-to-SQL Agent (Bedrock Claude)
├── SQL Executor (GCP Cloud SQL)
├── Summarizer / Insight Agent (Bedrock Claude)
├── Embedding Retriever (Bedrock Titan Embeddings)
└── Vector Search (Amazon OpenSearch)
↓
[GCP Cloud SQL (MySQL)]
↓
[Results → Visualization / Summary / Alert System]

```

---

## ☁️ Cloud Infrastructure

### Infrastructure Management
- **IaC**: Terraform (모든 인프라를 코드로 관리)
- **Multi-Cloud Setup**:  
  - **GCP** → Cloud SQL (MySQL)
  - **AWS** → Bedrock / OpenSearch / Lambda / Secrets Manager / QuickSight
- **Networking**:  
  - Cloud SQL Proxy (개발용)  
  - VPC Peering or Private Service Connect (운영 환경)

### Security
- Secrets (DB Credentials, API Keys) → AWS Secrets Manager
- Role-based IAM Policies for each Agent
- SSL/TLS enforced for cross-cloud communication

---

## ⚙️ Tech Stack

| 영역 | 기술 스택 |
|------|-------------|
| Language | TypeScript |
| Backend Framework | NestJS |
| ORM / DB Access | TypeORM |
| AI / LLM Orchestration | LangChain + LangGraph |
| LLM Provider | Amazon Bedrock (Claude 3 Sonnet / Haiku, Titan Embeddings) |
| Vector DB | Amazon OpenSearch Serverless |
| Infrastructure as Code | Terraform |
| Monitoring / Logging | AWS CloudWatch, OpenSearch Dashboards |
| Visualization (optional) | Amazon QuickSight / Streamlit |
| Package Manager | pnpm or yarn |

---

## 🧩 Functional Overview

### 1️⃣ Text-to-SQL Agent
- **Purpose**: 자연어 질의를 SQL 쿼리로 변환하여 DB 질의 수행
- **Model**: Amazon Bedrock Claude 3 Sonnet
- **Process**:
  1. 사용자 질문 → LLM Prompt
  2. Claude가 SQL 생성
  3. SQL Syntax 검증 (LangChain SQLChainValidator)
  4. TypeORM을 통해 GCP MySQL 질의 실행
  5. 결과를 JSON으로 반환

- **Prompt Example:**
```

User Question: "지난주 신규 입점 마켓 중 평균 상품 수가 가장 많은 지역은?"
→ SQL:
SELECT region, AVG(product_count)
FROM market
WHERE created_at > NOW() - INTERVAL 7 DAY
GROUP BY region
ORDER BY AVG(product_count) DESC LIMIT 1;

```

---

### 2️⃣ Data Insight & Summary Agent
- **Purpose**: SQL 결과를 요약, 인사이트화
- **LLM**: Claude 3 Sonnet / Haiku
- **Function**:
- 결과 요약 / 비교 분석 / 이상치 탐지
- 자연어 기반 결과 설명 생성 (“서울 지역이 1위로 나타났습니다.”)
- LangGraph 상에서 Text-to-SQL Agent 다음 단계로 자동 연결

---

### 3️⃣ Embedding & Semantic Search Agent
- **Purpose**: 상품, 옵션, 매장 등 텍스트 데이터의 의미 기반 검색
- **Model**: Amazon Titan Embeddings
- **Pipeline**:
1. MySQL에서 상품/옵션/매장 메타데이터 추출
2. Titan Embedding으로 벡터화
3. OpenSearch Serverless에 저장
4. 사용자가 “여름용 시원한 소재의 남성 셔츠 매장 보여줘” → 벡터 검색 수행
5. 유사도 기반 결과 반환

---

### 4️⃣ LangGraph Agent Orchestration
LangGraph를 이용해 각 Agent 간 상태 기반 워크플로우를 관리합니다.

#### Graph Example:
```

User Input
→ Text2SQL Agent
→ SQL Executor
→ Insight Summarizer
→ Output

```

#### State & Flow:
- 각 Node = LangChain Tool or Chain
- State = Query Context, DB Results, User Session
- Flow Control = Conditional Branch / Retry / Loop / Multi-Agent Delegation

---

## 🧮 Data Flow Summary

1. 관리자가 자연어로 질문을 입력  
2. LLM (Claude) → Text-to-SQL 변환  
3. NestJS → Cloud SQL 쿼리 실행  
4. 결과를 LangGraph 통해 Summarizer Agent로 전달  
5. Claude → 자연어 요약 / 차트 / 인사이트 생성  
6. OpenSearch를 통한 의미 기반 검색 병행 (선택적)  
7. 시각화 또는 응답을 관리자 화면에 표시  

---

## 🔐 Cross-Cloud Connectivity

### Development (Simple)
- Cloud SQL Public IP + SSL 인증
- `.env`에 Proxy 설정:
```

DATABASE_HOST=34.xxx.xxx.xxx
DATABASE_USER=yhkim
DATABASE_PASSWORD=*****
DATABASE_NAME=ndmarket

```

### Production (Secure)
- GCP ↔ AWS VPC Peering or Private Service Connect
- Cloud SQL Private IP 모드
- AWS Lambda/ECS에서 내부 네트워크 접근
- Secrets Manager로 자격 증명 관리

---

## 🧱 Infrastructure (Terraform Modules)

| 모듈 | 역할 |
|-------|------|
| `vpc/` | AWS VPC, Subnet, Gateway 생성 |
| `iam/` | Agent별 IAM Role, Bedrock Access Policy |
| `ecs/` | NestJS 서비스 배포 (ECS Fargate or Lambda) |
| `opensearch/` | OpenSearch Serverless Domain 설정 |
| `bedrock/` | Bedrock API 접근 설정 |
| `monitoring/` | CloudWatch Logs + Alarm 구성 |

---

## 🚀 MVP Implementation Plan

| 단계 | 기능 | 목표 |
|-------|------|------|
| 1단계 | Cloud SQL + Bedrock 연결 | Text-to-SQL 기본 질의 가능 |
| 2단계 | LangChain + LangGraph Agent 구성 | 다단계 질의/요약 파이프라인 완성 |
| 3단계 | OpenSearch Embedding 연동 | 의미 기반 상품 검색 추가 |
| 4단계 | QuickSight / Streamlit 시각화 | 관리자 대시보드 MVP 구축 |
| 5단계 | Terraform IaC 적용 | AWS 인프라 자동화 및 CI/CD 연동 |

---

## 🔗 Future Extensions

- **Bedrock Knowledge Base + RAG**: DB와 문서 결합형 질의 응답
- **Agent Collaboration System**: 여러 Agent 간 임무 분할/협업 수행
- **Real-time Analytics Agent**: 로그 기반 자동 요약/이상 탐지
- **Fine-tuned Embedding Model**: SageMaker에서 상품 데이터 기반 임베딩 고도화
- **Multi-Modal Input**: 이미지 기반 질의 확장 (예: “이 사진의 제품 재고 알려줘”)

---

## ✅ Summary for LLM Understanding

이 프로젝트는 다음 내용을 포함합니다:

- AWS Bedrock 기반 LLM/Text2SQL/Embedding 기능
- GCP Cloud SQL과의 안전한 연동
- LangChain + LangGraph 기반 멀티 에이전트 구조
- Terraform으로 구성된 멀티 클라우드 IaC
- NestJS 백엔드 + TypeORM 데이터 접근
- OpenSearch Serverless로 벡터 검색
- 관리자용 데이터 인사이트/조회 시스템
- 단계별 MVP → 확장형 아키텍처 로드맵

LLM은 위 설계를 기반으로 코드, 인프라, 프롬프트, 워크플로우, 또는 Agent별 로직을 생성할 수 있습니다.
```

---

이 문서는 `PROJECT_OVERVIEW.md`로 루트에 두면 됩니다.
이후 LLM이나 협업자가 “이 프로젝트에 대해 설명해줘” 또는 “MVP 코드 작성해줘”라고 요청하면
위 문서 하나로 전체 방향을 정확히 이해하고 개발을 이어갈 수 있습니다.

원하신다면 다음 단계로,
📁 `project structure` (`src/`, `infra/`, `agents/`, `terraform/` 등 디렉토리 설계)까지 자동 생성해드릴까요?
