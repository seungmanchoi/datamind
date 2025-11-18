import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

import { ClarifyingQuestionsDto } from './clarifying-question.dto';
import { InsightsDto } from './insights.dto';
import { VisualizationDto } from './visualization.dto';

/**
 * AI 질의 응답 DTO (Phase 7 Enhanced)
 * LLM이 자동으로 시각화 방법을 결정하고, 풍부한 인사이트를 제공합니다
 */
export class QueryResponseDto {
  /**
   * 사용자의 원래 질문
   * 예: "이번 주 매출이 얼마야?"
   */
  @IsString()
  query: string;

  /**
   * 생성된 SQL 쿼리
   */
  @IsString()
  sql: string;

  /**
   * 쿼리 실행 결과 데이터
   */
  @IsArray()
  results: unknown[];

  /**
   * 시각화 추천 정보
   * LLM이 데이터 특성에 따라 최적의 시각화 방법을 결정합니다
   */
  @ValidateNested()
  @Type(() => VisualizationDto)
  visualization: VisualizationDto;

  /**
   * AI 분석 인사이트
   * 요약, 핵심 발견사항, 트렌드, 비교, 추천 등을 포함합니다
   */
  @ValidateNested()
  @Type(() => InsightsDto)
  insights: InsightsDto;

  /**
   * 추가 질문 (선택적)
   * 사용자의 질의가 불충분할 경우에만 포함됩니다
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => ClarifyingQuestionsDto)
  clarifyingQuestions?: ClarifyingQuestionsDto;

  /**
   * SQL 실행 시간 (밀리초)
   */
  @IsNumber()
  executionTime: number;

  /**
   * 반환된 행 개수
   */
  @IsNumber()
  rowCount: number;

  /**
   * 응답 생성 시간 (ISO 8601 형식)
   */
  @IsString()
  timestamp: string;

  constructor(partial: Partial<QueryResponseDto>) {
    Object.assign(this, partial);
  }
}
