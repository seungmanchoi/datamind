# Few-Shot Learning 설정 가이드

Text-to-SQL Agent는 Few-Shot Learning을 사용하여 더 정확한 SQL 쿼리를 생성합니다.

## 개요

Few-Shot Learning은 LLM에게 몇 가지 예제를 보여주어 원하는 형식의 출력을 생성하도록 유도하는 기법입니다. NDMarket AI Insight Platform은 실제 데이터베이스 쿼리 예제를 사용하여 Text-to-SQL 변환의 정확도를 높입니다.

## Few-Shot 예제 구성

### 파일 위치
```
src/agents/config/fewshot-examples.ts
```

### 예제 구조

```typescript
export interface FewShotExample {
  question: string;      // 사용자 질의 (자연어)
  sql: string;          // 해당 질의에 대한 SQL 쿼리
  description?: string; // 예제 설명 (Agent 학습용)
}
```

## 포함된 예제 유형

### 1. 최신 데이터 조회
```
질문: "최근에 등록된 상품 5개를 보여줘"
→ product와 market JOIN, is_deleted 필터링, 날짜순 정렬
```

### 2. 집계 쿼리
```
질문: "상품이 가장 많은 마켓 상위 5개를 알려줘"
→ GROUP BY, COUNT, SUM 사용
```

### 3. 통계 데이터 조회
```
질문: "최근 5일간 주문 통계를 보여줘"
→ market_statistics_daily 테이블 활용
```

### 4. 조건부 필터링
```
질문: "1만원에서 3만원 사이의 상품을 보여줘"
→ BETWEEN 절 사용, 가격 범위 필터링
```

### 5. 정렬 및 순위
```
질문: "좋아요가 가장 많은 상품 10개를 보여줘"
→ ORDER BY like_count DESC, 복수 정렬 조건
```

### 6. 패턴 매칭
```
질문: "특정 마켓의 기본 정보를 알려줘"
→ LIKE 절 사용, 부분 문자열 검색
```

### 7. 카테고리 분석
```
질문: "카테고리별로 상품이 몇 개씩 있는지 알려줘"
→ LEFT JOIN, GROUP BY 카테고리
```

### 8. 날짜 범위 검색
```
질문: "이번 달에 등록된 상품을 보여줘"
→ DATE_FORMAT 함수, 동적 날짜 계산
```

### 9. 매출 통계
```
질문: "일별 주문 금액과 주문 건수를 보여줘"
→ SUM, AVG 집계 함수, GROUP BY 날짜
```

### 10. 복합 조건
```
질문: "소나타 마켓에서 가격이 2만원 이하인 상품 중 좋아요가 5개 이상인 상품을 보여줘"
→ 여러 WHERE 조건 AND 연결, 복수 정렬
```

## 예제 선택 로직

### 자동 관련성 평가
```typescript
getRelevantExamples(query: string, maxExamples: number = 3)
```

키워드 기반 매칭:
- **최신**: "최근", "최신", "새로", "등록"
- **인기**: "인기", "좋아요", "like", "많은"
- **가격**: "가격", "원", "저렴", "비싼"
- **마켓**: "마켓", "매장", "상점"
- **통계**: "통계", "집계", "분석", "매출", "주문"
- **카테고리**: "카테고리", "종류", "분류"

사용자 질의에 포함된 키워드와 예제 질문을 비교하여 가장 관련성 높은 3개 예제를 자동 선택합니다.

## 새로운 예제 추가 방법

### 1. MySQL MCP를 사용한 실제 데이터 조회

```bash
# MySQL MCP를 통해 실제 데이터베이스 쿼리
# 작동하는 SQL을 먼저 테스트
```

### 2. fewshot-examples.ts 파일에 추가

```typescript
export const fewShotExamples: FewShotExample[] = [
  // ... 기존 예제들 ...

  // 새로운 예제 추가
  {
    question: '사용자 질의 (자연어)',
    sql: `실제 작동하는 SQL 쿼리`,
    description: '예제 설명 및 특징',
  },
];
```

### 3. 빌드 및 테스트

```bash
# 빌드
pnpm run build

# 테스트
curl -X POST http://localhost:3000/agents/insight \
  -H "Content-Type: application/json" \
  -d '{"query": "새로운 질의 테스트"}'
```

## 베스트 프랙티스

### ✅ 좋은 예제

1. **실제 데이터베이스 스키마와 일치**
   - 실제 테이블명, 컬럼명 사용
   - MySQL MCP로 검증된 쿼리

2. **다양한 쿼리 패턴 포함**
   - JOIN, GROUP BY, HAVING, SUBQUERY 등
   - 날짜 함수, 집계 함수, 문자열 함수

3. **명확한 자연어 질문**
   - 실제 사용자가 할 법한 질문
   - 한국어 자연스러운 표현

4. **최적화된 SQL**
   - 인덱스 활용 고려
   - 불필요한 컬럼 조회 제외
   - LIMIT 절로 결과 제한

### ❌ 피해야 할 예제

1. **작동하지 않는 SQL**
   - 테스트 없이 추가한 쿼리
   - 오래된 스키마 기반 쿼리

2. **너무 복잡한 쿼리**
   - 4단계 이상 중첩 서브쿼리
   - 과도한 JOIN (5개 이상)

3. **애매한 질문**
   - "데이터 좀 보여줘"
   - "이거 어떻게 돼?"

## Few-Shot 효과 측정

### 개선 전후 비교

**개선 전** (스키마만 제공):
```
질문: "인기 상품 보여줘"
생성 SQL: SELECT * FROM product ORDER BY id DESC LIMIT 10
문제: like_count를 기준으로 정렬하지 않음, is_deleted 필터 누락
```

**개선 후** (Few-Shot 예제 제공):
```
질문: "인기 상품 보여줘"
생성 SQL:
SELECT p.product_name, p.price, p.like_count, m.market_name
FROM product p
JOIN market m ON p.market_id = m.id
WHERE p.is_deleted = 0
ORDER BY p.like_count DESC
LIMIT 10

✓ 올바른 정렬 기준 (like_count)
✓ 삭제된 상품 제외
✓ 마켓 정보 JOIN
```

## 향후 개선 계획

### Phase 3: Embedding 기반 유사도 검색
현재는 키워드 매칭으로 관련 예제를 선택하지만, Phase 3에서 OpenSearch Serverless를 도입하면:

1. **예제 Embedding 저장**
   - 모든 Few-Shot 예제를 벡터화
   - OpenSearch에 인덱싱

2. **의미 기반 검색**
   - 사용자 질의를 벡터화
   - 가장 유사한 예제 자동 선택
   - 키워드 매칭보다 정확도 향상

3. **동적 예제 업데이트**
   - 실제 사용자 질의와 생성된 SQL을 예제로 추가
   - 지속적인 학습 및 개선

## 참고 자료

- [LangChain Few-Shot Prompting](https://python.langchain.com/docs/modules/model_io/prompts/few_shot_examples)
- [Text-to-SQL Best Practices](https://arxiv.org/abs/2204.00498)
- NDMarket 데이터베이스 스키마: `docs/database-schema.md`
