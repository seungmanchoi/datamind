import { IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * 시각화 타입 DTO
 * LLM이 데이터 특성에 따라 최적의 시각화 방법을 결정합니다
 */
export class VisualizationDto {
  /**
   * 시각화 표시 방법
   * - chart: 차트로 표시
   * - table: 테이블로 표시
   * - both: 차트와 테이블 모두 표시
   */
  @IsEnum(['chart', 'table', 'both'])
  type: 'chart' | 'table' | 'both';

  /**
   * 차트 타입 (type이 'chart' 또는 'both'일 경우 필수)
   * - bar: 막대 그래프 (비교에 적합)
   * - line: 선 그래프 (추세에 적합)
   * - pie: 원 그래프 (비율에 적합)
   */
  @IsOptional()
  @IsEnum(['bar', 'line', 'pie'])
  chartType?: 'bar' | 'line' | 'pie';

  /**
   * 해당 시각화 방법을 선택한 이유
   * 예: "시간대별 매출 추이를 보기 위해 선 그래프가 적합합니다"
   */
  @IsString()
  reason: string;
}
