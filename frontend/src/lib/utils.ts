import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 숫자를 천단위 콤마로 포맷팅 (금액용)
 * @param value - 숫자 값
 * @returns 포맷된 문자열 (예: "1,234,567")
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0';
  }

  return num.toLocaleString('ko-KR');
}

/**
 * 숫자를 천단위 콤마로 포맷팅 (단위 없음)
 * @param value - 숫자 값
 * @returns 포맷된 문자열 (예: "1,234,567")
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0';
  }

  return num.toLocaleString('ko-KR');
}

/**
 * 영문 컬럼명을 한글로 변환
 * @param columnName - 영문 컬럼명
 * @returns 한글 컬럼명
 */
export function translateColumnName(columnName: string): string {
  const columnMap: Record<string, string> = {
    // 상품 관련
    product_name: '상품명',
    product_id: '상품ID',
    price: '가격',
    original_price: '원가',
    sale_price: '판매가',
    discount_price: '할인가',
    stock: '재고',
    stock_quantity: '재고수량',

    // 매장/마켓 관련
    market_name: '매장명',
    market_id: '매장ID',
    store_name: '매장명',
    store_id: '매장ID',

    // 카테고리 관련
    category_name: '카테고리',
    category_id: '카테고리ID',
    sub_category: '서브카테고리',

    // 통계/집계 관련
    total_sales: '총매출',
    total_amount: '총금액',
    total_price: '총가격',
    total_count: '총개수',
    total_quantity: '총수량',
    sales_amount: '매출액',
    revenue: '수익',
    profit: '이익',
    avg_price: '평균가격',
    average_price: '평균가격',
    avg_sales: '평균매출',
    average_sales: '평균매출',
    sum_price: '합계금액',
    sum_sales: '합계매출',

    // 주문 관련
    order_count: '주문수',
    order_id: '주문ID',
    order_date: '주문일',
    order_status: '주문상태',
    quantity: '수량',

    // 좋아요/조회 관련
    like_count: '좋아요수',
    likes: '좋아요',
    view_count: '조회수',
    views: '조회수',
    click_count: '클릭수',

    // 날짜 관련
    created_at: '등록일',
    updated_at: '수정일',
    deleted_at: '삭제일',
    date: '날짜',
    month: '월',
    year: '연도',
    week: '주',
    day: '일',

    // 사용자 관련
    user_name: '사용자명',
    user_id: '사용자ID',
    customer_name: '고객명',
    customer_id: '고객ID',

    // 기타
    description: '설명',
    status: '상태',
    type: '유형',
    name: '이름',
    title: '제목',
    count: '개수',
    amount: '금액',
    percent: '비율',
    ratio: '비율',
    rank: '순위',
    ranking: '순위',
  };

  // 정확히 매칭되는 경우
  const lowerName = columnName.toLowerCase();
  if (columnMap[lowerName]) {
    return columnMap[lowerName];
  }

  // 부분 매칭 시도 (예: total_order_count → 총주문수)
  for (const [eng, kor] of Object.entries(columnMap)) {
    if (lowerName.includes(eng)) {
      return kor;
    }
  }

  // 매칭되지 않으면 원본 반환
  return columnName;
}
