/**
 * Few-Shot 예제 설정
 * Text-to-SQL Agent가 참조하는 샘플 쿼리 모음
 * 실제 NDMarket 데이터베이스 스키마와 데이터를 기반으로 작성됨
 */

export interface FewShotExample {
  /** 사용자 질의 (자연어) */
  question: string;
  /** 해당 질의에 대한 SQL 쿼리 */
  sql: string;
  /** 예제 설명 (Agent 학습용) */
  description?: string;
}

/**
 * Few-Shot 예제 목록
 * Agent가 유사한 질의를 받았을 때 이 예제를 참조하여 SQL 생성
 */
export const fewShotExamples: FewShotExample[] = [
  // 1. 최신 상품 조회
  {
    question: '최근에 등록된 상품 5개를 보여줘',
    sql: `SELECT
  p.id,
  p.product_name,
  p.price,
  p.like_count,
  m.market_name,
  p.create_date
FROM product p
JOIN market m ON p.market_id = m.id
WHERE p.is_deleted = 0
ORDER BY p.create_date DESC
LIMIT 5`,
    description: '최신 등록 상품 조회 - product와 market JOIN, is_deleted 필터링',
  },

  // 2. 마켓별 상품 수 집계
  {
    question: '상품이 가장 많은 마켓 상위 5개를 알려줘',
    sql: `SELECT
  m.market_name,
  COUNT(p.id) as product_count,
  SUM(p.like_count) as total_likes
FROM market m
LEFT JOIN product p ON m.id = p.market_id AND p.is_deleted = 0
GROUP BY m.id, m.market_name
ORDER BY product_count DESC
LIMIT 5`,
    description: '마켓별 상품 수 집계 - LEFT JOIN으로 상품이 없는 마켓도 포함',
  },

  // 3. 일별 통계 조회
  {
    question: '최근 5일간 주문 통계를 보여줘',
    sql: `SELECT
  statistics_date,
  order_count,
  order_price,
  product_view_count,
  product_like_count
FROM market_statistics_daily
ORDER BY statistics_date DESC
LIMIT 5`,
    description: '일별 통계 조회 - market_statistics_daily 테이블 사용',
  },

  // 4. 가격대별 상품 조회
  {
    question: '1만원에서 3만원 사이의 상품을 보여줘',
    sql: `SELECT
  p.product_name,
  p.price,
  m.market_name,
  p.like_count
FROM product p
JOIN market m ON p.market_id = m.id
WHERE p.is_deleted = 0
  AND p.price BETWEEN 10000 AND 30000
ORDER BY p.price ASC
LIMIT 20`,
    description: '가격 범위 필터링 - BETWEEN 사용',
  },

  // 5. 인기 상품 조회
  {
    question: '좋아요가 가장 많은 상품 10개를 보여줘',
    sql: `SELECT
  p.product_name,
  p.price,
  p.like_count,
  m.market_name,
  p.create_date
FROM product p
JOIN market m ON p.market_id = m.id
WHERE p.is_deleted = 0
ORDER BY p.like_count DESC, p.create_date DESC
LIMIT 10`,
    description: '인기 상품 조회 - like_count 기준 정렬, 동일 시 최신순',
  },

  // 6. 마켓 정보 조회
  {
    question: '특정 마켓의 기본 정보를 알려줘',
    sql: `SELECT
  market_name,
  business_name,
  tel,
  address,
  market_status,
  create_date
FROM market
WHERE market_name LIKE '%소나타%'
LIMIT 1`,
    description: '마켓 정보 조회 - LIKE 사용한 패턴 매칭',
  },

  // 7. 카테고리별 상품 수
  {
    question: '카테고리별로 상품이 몇 개씩 있는지 알려줘',
    sql: `SELECT
  c.category_name,
  COUNT(p.id) as product_count
FROM category c
LEFT JOIN product p ON c.id = p.category_id AND p.is_deleted = 0
GROUP BY c.id, c.category_name
ORDER BY product_count DESC
LIMIT 10`,
    description: '카테고리별 집계 - category 테이블 조인',
  },

  // 8. 날짜 범위 조회
  {
    question: '이번 달에 등록된 상품을 보여줘',
    sql: `SELECT
  p.product_name,
  p.price,
  m.market_name,
  p.create_date
FROM product p
JOIN market m ON p.market_id = m.id
WHERE p.is_deleted = 0
  AND p.create_date >= DATE_FORMAT(NOW(), '%Y-%m-01')
ORDER BY p.create_date DESC
LIMIT 20`,
    description: '날짜 범위 필터링 - DATE_FORMAT 함수 사용',
  },

  // 9. 매출 통계
  {
    question: '일별 주문 금액과 주문 건수를 보여줘',
    sql: `SELECT
  statistics_date,
  SUM(order_count) as total_orders,
  SUM(order_price) as total_sales,
  AVG(order_price) as avg_order_value
FROM market_statistics_daily
GROUP BY statistics_date
ORDER BY statistics_date DESC
LIMIT 30`,
    description: '일별 매출 통계 - 집계 함수 사용 (SUM, AVG)',
  },

  // 10. 복합 조건 검색
  {
    question: '소나타 마켓에서 가격이 2만원 이하인 상품 중 좋아요가 5개 이상인 상품을 보여줘',
    sql: `SELECT
  p.product_name,
  p.price,
  p.like_count,
  m.market_name
FROM product p
JOIN market m ON p.market_id = m.id
WHERE p.is_deleted = 0
  AND m.market_name = '소나타'
  AND p.price <= 20000
  AND p.like_count >= 5
ORDER BY p.like_count DESC, p.price ASC
LIMIT 20`,
    description: '복합 조건 검색 - 여러 WHERE 조건 조합',
  },

  // 11. 카테고리별 판매량 조회 (order 테이블 JOIN)
  {
    question: '요즘 많이 팔리는 악세사리는 어떤거야?',
    sql: `SELECT
  p.product_name AS 상품명,
  c.category_name AS 카테고리,
  SUM(ompo.final_quantity) AS 판매수량,
  SUM(ompo.final_total_price) AS 총판매금액
FROM order_market_product_option ompo
JOIN order_market_product omp ON ompo.order_market_product_id = omp.id
JOIN product p ON omp.product_id = p.id
JOIN category c ON p.category_id = c.id
JOIN order_market om ON omp.order_market_id = om.id
JOIN \`order\` o ON om.order_id = o.id
WHERE c.category1_name = '악세사리'
  AND o.order_status IN (3, 4, 5)
  AND o.order_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
GROUP BY p.id, p.product_name, c.category_name
ORDER BY 판매수량 DESC
LIMIT 10`,
    description:
      '카테고리별 판매량 조회 - order_market_product_option → order → order_status 필터링 필수. order_market에는 order_status가 없으므로 order 테이블 JOIN 필요',
  },

  // 12. 대분류 카테고리로 상품 조회
  {
    question: '의류 카테고리의 상품을 보여줘',
    sql: `SELECT
  p.product_name,
  p.price,
  c.category1_name AS 대분류,
  c.category2_name AS 중분류,
  c.category3_name AS 소분류,
  m.market_name,
  p.like_count
FROM product p
JOIN category c ON p.category_id = c.id
JOIN market m ON p.market_id = m.id
WHERE p.is_deleted = 0
  AND c.category1_name = '의류'
ORDER BY p.create_date DESC
LIMIT 20`,
    description: '대분류 카테고리 필터링 - category1_name 사용, 계층 정보(category1/2/3_name) 포함',
  },

  // 13. 중분류 카테고리로 상품 조회
  {
    question: '귀걸이 상품 중에서 인기있는거 보여줘',
    sql: `SELECT
  p.product_name,
  p.price,
  c.category1_name AS 대분류,
  c.category2_name AS 중분류,
  c.category3_name AS 소분류,
  p.like_count,
  m.market_name
FROM product p
JOIN category c ON p.category_id = c.id
JOIN market m ON p.market_id = m.id
WHERE p.is_deleted = 0
  AND c.category1_name = '악세사리'
  AND c.category2_name = '귀걸이'
ORDER BY p.like_count DESC, p.create_date DESC
LIMIT 15`,
    description: '중분류 카테고리 필터링 - category1_name + category2_name 조합, 계층 구조 활용',
  },

  // 14. 소분류 카테고리로 상품 조회
  {
    question: '스터드 귀걸이 상품을 보여줘',
    sql: `SELECT
  p.product_name,
  p.price,
  c.category1_name AS 대분류,
  c.category2_name AS 중분류,
  c.category3_name AS 소분류,
  c.depth,
  m.market_name,
  p.like_count
FROM product p
JOIN category c ON p.category_id = c.id
JOIN market m ON p.market_id = m.id
WHERE p.is_deleted = 0
  AND c.category1_name = '악세사리'
  AND c.category2_name = '귀걸이'
  AND c.category3_name = '스터드'
  AND c.depth = 3
ORDER BY p.create_date DESC
LIMIT 20`,
    description: '소분류 카테고리 필터링 - category3_name 사용, depth=3으로 최하위 카테고리 확인, 전체 계층 정보 포함',
  },

  // 15. 카테고리 계층 구조 조회
  {
    question: '악세사리 카테고리에는 어떤 종류가 있어?',
    sql: `SELECT
  c.category1_name AS 대분류,
  c.category2_name AS 중분류,
  c.category3_name AS 소분류,
  c.depth,
  COUNT(p.id) AS 상품수
FROM category c
LEFT JOIN product p ON c.id = p.category_id AND p.is_deleted = 0
WHERE c.category1_name = '악세사리'
  AND c.is_disabled = 0
GROUP BY c.id, c.category1_name, c.category2_name, c.category3_name, c.depth
ORDER BY c.depth ASC, c.category2_name ASC, c.category3_name ASC
LIMIT 50`,
    description:
      '카테고리 계층 구조 탐색 - depth로 계층 구분(1=대분류, 2=중분류, 3=소분류), is_disabled=0으로 활성 카테고리만 조회',
  },

  // 16. 특정 카테고리 판매량 Top N (30일 기준)
  {
    question: '아동복은 어떤게 잘 나가? 30일간 많이 팔린건 어떤건지 보여줘 50개 보여줘',
    sql: `SELECT
  p.product_name AS 상품명,
  c.category1_name AS 대분류,
  c.category2_name AS 중분류,
  c.category3_name AS 소분류,
  m.market_name AS 마켓,
  SUM(ompo.final_quantity) AS 판매수량,
  SUM(ompo.final_total_price) AS 총판매금액,
  ROUND(SUM(ompo.final_total_price) / SUM(ompo.final_quantity), 0) AS 평균단가
FROM order_market_product_option ompo
JOIN order_market_product omp ON ompo.order_market_product_id = omp.id
JOIN product p ON omp.product_id = p.id
JOIN category c ON p.category_id = c.id
JOIN market m ON p.market_id = m.id
JOIN order_market om ON omp.order_market_id = om.id
JOIN \`order\` o ON om.order_id = o.id
WHERE c.category1_name = '아동복'
  AND o.order_status IN (3, 4, 5)
  AND o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY p.id, p.product_name, c.category1_name, c.category2_name, c.category3_name, m.market_name
ORDER BY 판매수량 DESC
LIMIT 50`,
    description:
      '특정 카테고리 판매량 Top N - order_market_product_option.final_quantity 사용 (NOT order_market_product), category1_name으로 대분류 필터링, 30일 기간, order_status IN (3,4,5)로 유효 주문만, 카테고리 계층 정보와 마켓 정보 포함',
  },
];

/**
 * Few-Shot 예제를 프롬프트용 텍스트로 포맷팅
 */
export function formatFewShotExamples(): string {
  return fewShotExamples
    .map(
      (example, index) => `
Example ${index + 1}:
Question: "${example.question}"
SQL: ${example.sql}
`,
    )
    .join('\n');
}

/**
 * 관련 Few-Shot 예제 필터링 (향후 Embedding 기반 유사도 검색으로 개선 가능)
 * @param query - 사용자 질의
 * @param maxExamples - 최대 반환 예제 수
 */
export function getRelevantExamples(query: string, maxExamples: number = 3): FewShotExample[] {
  // 키워드 매칭 기반 간단한 필터링
  const keywords = {
    최신: ['최근', '최신', '새로', '등록'],
    인기: ['인기', '좋아요', 'like', '많은'],
    가격: ['가격', '원', '저렴', '비싼'],
    마켓: ['마켓', '매장', '상점'],
    통계: ['통계', '집계', '분석', '매출', '주문', '판매량'],
    카테고리: [
      '카테고리',
      '종류',
      '분류',
      '대분류',
      '중분류',
      '소분류',
      '의류',
      '아동복',
      '악세사리',
      '귀걸이',
      '목걸이',
      '반지',
      '팔찌',
      '스터드',
      '드롭',
      '식품',
      '주방용품',
    ],
  };

  const queryLower = query.toLowerCase();
  const scoredExamples = fewShotExamples.map((example) => {
    let score = 0;

    // 키워드 매칭 점수 계산
    Object.entries(keywords).forEach(([, terms]) => {
      terms.forEach((term) => {
        if (queryLower.includes(term)) {
          score++;
        }
        if (example.question.toLowerCase().includes(term)) {
          score++;
        }
      });
    });

    return { example, score };
  });

  // 점수 순으로 정렬하여 상위 N개 반환
  return scoredExamples
    .sort((a, b) => b.score - a.score)
    .slice(0, maxExamples)
    .map((item) => item.example);
}
