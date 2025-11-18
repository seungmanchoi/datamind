# NDMarket AI Insight Platform - Phase 로드맵

## 📋 전체 개요

이 문서는 NDMarket AI Insight Platform MVP 구축을 위한 5개 Phase의 실행 계획을 정의합니다.
각 Phase는 독립적으로 실행 가능하며, LLM이 spec-kit 형태로 작업을 수행할 수 있도록 구조화되어 있습니다.

## 🎯 프로젝트 목표

GCP Cloud SQL(MySQL) 데이터를 AWS 생성형 AI 인프라(Bedrock, OpenSearch, LangChain)와 연동하여
자연어 질의로 데이터 인사이트를 제공하는 Multi-Agent 시스템 구축

## 🗺️ Phase 로드맵

```
Phase 1: Foundation (2주)
    ↓
Phase 2: Agent System (3주)
    ↓
Phase 3: Vector Search (2주)
    ↓
Phase 4: Dashboard (2주)
    ↓
Phase 5: Infrastructure (2주)
```

## 📊 Phase 상세 개요

### Phase 1: Foundation
**목표**: GCP Cloud SQL과 AWS Bedrock 기본 연결 구축
**주요 작업**:
- Cloud SQL 연결 설정 (개발/프로덕션)
- AWS Bedrock Claude 3 연동
- Text-to-SQL 기본 구현
- 환경 변수 및 Secrets 관리

**산출물**: 자연어 → SQL 쿼리 → 결과 반환 파이프라인

---

### Phase 2: Agent System
**목표**: LangChain/LangGraph 기반 Multi-Agent 시스템 구축
**주요 작업**:
- LangChain Tools/Chains 구현
- LangGraph 워크플로우 설계
- Text-to-SQL Agent, Insight Summarizer Agent 구현
- State Management 및 Agent 협업 구조

**산출물**: 복잡한 질의를 처리하는 Multi-Agent 파이프라인

---

### Phase 3: Vector Search
**목표**: 의미 기반 검색을 위한 Embedding 및 Vector DB 연동
**주요 작업**:
- Amazon Titan Embeddings 연동
- OpenSearch Serverless 설정
- 데이터 벡터화 파이프라인
- 의미 기반 검색 Agent 구현

**산출물**: 자연어 기반 상품/매장 검색 기능

---

### Phase 4: Dashboard
**목표**: 관리자용 인사이트 대시보드 구축
**주요 작업**:
- 관리자 UI/UX 설계
- QuickSight 또는 Streamlit 연동
- 시각화 컴포넌트 구현
- 실시간 인사이트 표시

**산출물**: 관리자 대시보드 MVP

---

### Phase 5: Infrastructure
**목표**: 프로덕션 인프라 자동화 및 배포
**주요 작업**:
- Terraform 모듈 구성 (VPC, IAM, OpenSearch, Monitoring)
- CI/CD 파이프라인 구축
- 모니터링 및 로깅 시스템
- 프로덕션 배포 및 검증

**산출물**: 완전 자동화된 인프라 및 배포 파이프라인

---

## 🔗 Phase 간 의존성

```
Phase 1 (필수) → Phase 2 (필수) → Phase 3 (선택적) → Phase 4 (선택적) → Phase 5 (프로덕션 필수)
```

- **Phase 1**: 모든 Phase의 기반
- **Phase 2**: Phase 1 완료 후 진행
- **Phase 3**: Phase 2와 병렬 진행 가능
- **Phase 4**: Phase 2 또는 3 완료 후 진행
- **Phase 5**: 모든 기능 완료 후 진행

## ✅ 전체 프로젝트 완료 기준

- [ ] 자연어 질의로 DB 데이터 조회 가능
- [ ] Multi-Agent 협업으로 복잡한 분석 수행
- [ ] 의미 기반 검색으로 상품/매장 찾기 가능
- [ ] 관리자 대시보드에서 인사이트 시각화
- [ ] Terraform으로 전체 인프라 자동 배포 가능
- [ ] 프로덕션 환경에서 안정적 운영
- [ ] 모니터링 및 알람 시스템 작동
- [ ] 보안 및 컴플라이언스 요구사항 충족

## 📝 문서 사용 방법

### LLM에게 작업 지시하기

각 Phase 문서는 다음과 같이 사용할 수 있습니다:

```
"docs/phases/01-Foundation.md를 참고하여 Task 1.1을 구현해주세요"
```

### Phase 문서 구조

각 Phase 문서는 다음 섹션을 포함합니다:
- **작업 정의 및 목표 (What & Why)**: 무엇을, 왜 하는가
- **기술 스펙 및 제약사항**: 어떤 기술을 사용하고 무엇을 고려해야 하는가
- **Task 목록**: 구체적인 작업들 (각 Task는 What/Why, Tech Spec, How, Acceptance Criteria 포함)
- **Phase 완료 기준**: 전체 Phase 수락 조건

## 🎯 다음 단계

1. [Phase 1: Foundation](./01-Foundation.md) 문서를 확인하여 첫 번째 Phase를 시작하세요
2. 각 Task의 Acceptance Criteria를 충족하면서 순차적으로 진행하세요
3. Phase 완료 기준을 모두 충족하면 다음 Phase로 이동하세요
