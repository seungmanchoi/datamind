import { IsArray, IsOptional, IsString } from 'class-validator';

/**
 * 인사이트 DTO
 * SQL 쿼리 결과에 대한 AI 분석 및 통찰
 */
export class InsightsDto {
  /**
   * 전체 요약
   * 예: "최근 7일간 총 매출은 15,234,000원으로 전주 대비 12% 증가했습니다."
   */
  @IsString()
  summary: string;

  /**
   * 핵심 발견사항 (이모지 포함)
   * 예: [
   *   "📈 주말 매출이 평일 대비 35% 높습니다",
   *   "⭐ 베스트셀러는 '프리미엄 세트'로 전체 매출의 28%를 차지합니다",
   *   "🕐 오후 2-6시가 가장 높은 매출 시간대입니다"
   * ]
   */
  @IsArray()
  @IsString({ each: true })
  keyFindings: string[];

  /**
   * 비교 분석 (선택적)
   * 예: "이번 주 매출은 지난주보다 12% 증가했으며, 작년 동기 대비 23% 성장했습니다."
   */
  @IsOptional()
  @IsString()
  comparison?: string;

  /**
   * 추세 분석 (선택적)
   * 예: "최근 한 달간 지속적인 상승세를 보이고 있으며, 특히 주말 매출 증가가 두드러집니다."
   */
  @IsOptional()
  @IsString()
  trend?: string;

  /**
   * 이상치 또는 특이사항 (선택적)
   * 예: "⚠️ 12월 25일 매출이 평균 대비 3배 이상 급증했습니다."
   */
  @IsOptional()
  @IsString()
  anomaly?: string;

  /**
   * 추천 사항 (선택적)
   * 예: "💡 주말 특별 프로모션을 강화하면 매출 증대 효과가 클 것으로 예상됩니다."
   */
  @IsOptional()
  @IsString()
  recommendation?: string;
}
