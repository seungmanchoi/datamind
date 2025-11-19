import { Injectable } from '@nestjs/common';

import { ClarifyingQuestionItemDto, ClarifyingQuestionsDto } from './dto/clarifying-question.dto';
import { InsightsDto } from './dto/insights.dto';
import { QueryResponseDto } from './dto/query-response.dto';
import { VisualizationDto } from './dto/visualization.dto';
import { EnhancedQueryResult } from './query.service';

@Injectable()
export class QueryMapper {
  /**
   * Phase 7: EnhancedQueryResult를 QueryResponseDto로 변환
   * @param result Enhanced Query Result from QueryService
   * @returns QueryResponseDto with all Phase 7 fields
   */
  toDto(result: EnhancedQueryResult): QueryResponseDto {
    const dto = new QueryResponseDto({
      query: result.query,
      sql: result.sql,
      results: result.results,
      executionTime: result.executionTime,
      rowCount: result.results.length,
      timestamp: new Date().toISOString(),
      visualization: this.mapVisualization(result.visualization),
      insights: this.mapInsights(result.insights),
    });

    // 추가 질문이 있는 경우에만 포함
    if (result.clarifyingQuestions) {
      dto.clarifyingQuestions = this.mapClarifyingQuestions(result.clarifyingQuestions);
    }

    return dto;
  }

  /**
   * 시각화 정보 매핑
   */
  private mapVisualization(visualization: {
    type: 'chart' | 'table' | 'both';
    chartType?: 'bar' | 'line' | 'pie';
    reason: string;
  }): VisualizationDto {
    const viz = new VisualizationDto();
    viz.type = visualization.type;
    viz.chartType = visualization.chartType;
    viz.reason = visualization.reason;
    return viz;
  }

  /**
   * 인사이트 정보 매핑
   */
  private mapInsights(insights: {
    summary: string;
    keyFindings: string[];
    comparison?: string;
    trend?: string;
    anomaly?: string;
    recommendation?: string;
  }): InsightsDto {
    const ins = new InsightsDto();
    ins.summary = insights.summary;
    ins.keyFindings = insights.keyFindings;
    ins.comparison = insights.comparison;
    ins.trend = insights.trend;
    ins.anomaly = insights.anomaly;
    ins.recommendation = insights.recommendation;
    return ins;
  }

  /**
   * 추가 질문 정보 매핑
   */
  private mapClarifyingQuestions(questions: {
    reason: string;
    questions: Array<{
      type: 'period' | 'limit' | 'filter' | 'grouping' | 'category';
      question: string;
      options: string[];
      default: string;
    }>;
  }): ClarifyingQuestionsDto {
    const clarifying = new ClarifyingQuestionsDto();
    clarifying.reason = questions.reason;
    clarifying.questions = questions.questions.map((q) => {
      const item = new ClarifyingQuestionItemDto();
      item.type = q.type;
      item.question = q.question;
      item.options = q.options;
      item.default = q.default;
      return item;
    });
    return clarifying;
  }
}
