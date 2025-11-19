import { IsArray, IsEnum, IsString } from 'class-validator';

/**
 * 개별 추가 질문 DTO
 */
export class ClarifyingQuestionItemDto {
  /**
   * 질문 타입
   * - period: 기간 관련 질문 (예: "어떤 기간의 데이터를 보고 싶으신가요?")
   * - limit: 개수 제한 질문 (예: "상위 몇 개를 보여드릴까요?")
   * - filter: 필터링 질문 (예: "특정 카테고리로 한정하시겠습니까?")
   * - grouping: 그룹화 질문 (예: "일별, 주별, 월별 중 어떻게 보시겠습니까?")
   * - category: 카테고리 선택 질문 (예: "어떤 카테고리의 상품을 보시겠습니까?")
   */
  @IsEnum(['period', 'limit', 'filter', 'grouping', 'category'])
  type: 'period' | 'limit' | 'filter' | 'grouping' | 'category';

  /**
   * 질문 내용
   * 예: "어떤 기간의 매출 데이터를 확인하시겠습니까?"
   */
  @IsString()
  question: string;

  /**
   * 선택 가능한 옵션들
   * 예: ["최근 7일", "최근 30일", "최근 3개월", "올해"]
   */
  @IsArray()
  @IsString({ each: true })
  options: string[];

  /**
   * 기본 선택값
   * 예: "최근 7일"
   */
  @IsString()
  default: string;
}

/**
 * 추가 질문 DTO
 * 사용자의 질의가 불충분할 때 LLM이 생성하는 명확화 질문들
 */
export class ClarifyingQuestionsDto {
  /**
   * 추가 질문이 필요한 이유
   * 예: "매출 조회 기간과 표시할 데이터 개수가 명시되지 않았습니다."
   */
  @IsString()
  reason: string;

  /**
   * 추가 질문 목록
   */
  @IsArray()
  questions: ClarifyingQuestionItemDto[];
}
