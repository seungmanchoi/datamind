import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { FollowUpQuestion } from '@/dto/response/multi-agent-response.dto';

/**
 * 후속 질문 도구 생성 팩토리
 */
export function createFollowupTools() {
  /**
   * 후속 질문 생성 도구
   */
  const generateFollowupQuestions = tool(
    async ({ context, analysisType, dataDescription }) => {
      const questions: FollowUpQuestion[] = [];
      let questionId = 1;

      // 분석 타입에 따른 질문 생성
      if (analysisType === 'sales' || analysisType === 'revenue') {
        questions.push(
          {
            id: `fq_${questionId++}`,
            text: '지난 달과 비교하면 어떤가요?',
            category: 'comparison',
            icon: '📊',
            autoQuery: `${context} 지난 달과 비교해줘`,
          },
          {
            id: `fq_${questionId++}`,
            text: '카테고리별로 세분화해서 볼까요?',
            category: 'deep_dive',
            icon: '🔍',
            autoQuery: `${context} 카테고리별로 분석해줘`,
          },
          {
            id: `fq_${questionId++}`,
            text: '요일별 패턴은 어떤가요?',
            category: 'expansion',
            icon: '📅',
            autoQuery: `${context} 요일별 분석`,
          },
        );
      }

      if (analysisType === 'product' || analysisType === 'ranking') {
        questions.push(
          {
            id: `fq_${questionId++}`,
            text: '이 상품들의 재고 상황은?',
            category: 'expansion',
            icon: '📦',
            autoQuery: '상위 상품들의 재고 현황',
          },
          {
            id: `fq_${questionId++}`,
            text: '비슷한 상품은 어떤 게 있나요?',
            category: 'expansion',
            icon: '🔗',
            autoQuery: '유사 상품 추천',
          },
        );
      }

      if (analysisType === 'customer') {
        questions.push(
          {
            id: `fq_${questionId++}`,
            text: '재구매율은 어떻게 되나요?',
            category: 'deep_dive',
            icon: '🔄',
            autoQuery: '고객 재구매율 분석',
          },
          {
            id: `fq_${questionId++}`,
            text: '지역별 고객 분포는?',
            category: 'expansion',
            icon: '🗺️',
            autoQuery: '지역별 고객 분석',
          },
        );
      }

      // 기본 질문 추가
      if (questions.length < 3) {
        questions.push(
          {
            id: `fq_${questionId++}`,
            text: '더 자세한 분석이 필요한가요?',
            category: 'deep_dive',
            icon: '🔍',
          },
          {
            id: `fq_${questionId++}`,
            text: '다른 관점에서 분석해볼까요?',
            category: 'expansion',
            icon: '💡',
          },
        );
      }

      // 액션 제안 질문
      questions.push({
        id: `fq_${questionId++}`,
        text: '이 결과를 바탕으로 어떤 조치가 필요할까요?',
        category: 'action',
        icon: '🎯',
      });

      return JSON.stringify({
        questions: questions.slice(0, 5), // 최대 5개
      });
    },
    {
      name: 'generate_followup_questions',
      description: '현재 분석 컨텍스트를 기반으로 관련 후속 질문을 생성합니다.',
      schema: z.object({
        context: z.string().describe('현재 분석 컨텍스트 (원본 질문)'),
        analysisType: z
          .enum(['sales', 'revenue', 'product', 'ranking', 'customer', 'trend', 'general'])
          .describe('분석 유형'),
        dataDescription: z.string().optional().describe('데이터 설명'),
      }),
    },
  );

  /**
   * 심층 분석 제안 도구
   */
  const suggestDeepDive = tool(
    async ({ currentInsights, dataFields }) => {
      const suggestions: string[] = [];

      // 현재 인사이트 기반 심층 분석 제안
      if (currentInsights.includes('성장') || currentInsights.includes('증가')) {
        suggestions.push('성장 요인 분석 - 어떤 세그먼트가 성장을 주도하는지');
        suggestions.push('성장 지속성 분석 - 트렌드가 계속될지 예측');
      }

      if (currentInsights.includes('감소') || currentInsights.includes('하락')) {
        suggestions.push('하락 원인 분석 - 문제 영역 식별');
        suggestions.push('회복 방안 분석 - 개선할 수 있는 부분');
      }

      if (currentInsights.includes('이상') || currentInsights.includes('급')) {
        suggestions.push('이상치 원인 분석 - 특수 상황 확인');
        suggestions.push('영향도 분석 - 다른 지표에 미치는 영향');
      }

      // 데이터 필드 기반 제안
      if (dataFields.includes('category') || dataFields.includes('카테고리')) {
        suggestions.push('카테고리 심층 분석');
      }

      if (dataFields.includes('date') || dataFields.includes('날짜')) {
        suggestions.push('시계열 패턴 분석');
      }

      return JSON.stringify({
        suggestions: suggestions.slice(0, 3),
      });
    },
    {
      name: 'suggest_deep_dive',
      description: '현재 인사이트를 기반으로 심층 분석 방향을 제안합니다.',
      schema: z.object({
        currentInsights: z.string().describe('현재 인사이트 요약'),
        dataFields: z.array(z.string()).describe('데이터 필드 목록'),
      }),
    },
  );

  return { generateFollowupQuestions, suggestDeepDive };
}

export type FollowupTools = ReturnType<typeof createFollowupTools>;
