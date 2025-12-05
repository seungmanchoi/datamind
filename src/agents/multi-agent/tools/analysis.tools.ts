import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * 데이터 분석 도구 생성 팩토리
 */
export function createAnalysisTools() {
  /**
   * 데이터 트렌드 분석 도구
   */
  const analyzeTrends = tool(
    async ({ data, timeField, valueField }) => {
      try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        if (!Array.isArray(parsedData) || parsedData.length === 0) {
          return JSON.stringify({ error: true, message: '분석할 데이터가 없습니다.' });
        }

        // 간단한 트렌드 분석
        const values = parsedData.map((item) => Number(item[valueField]) || 0);
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));

        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
        const trend = changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable';

        return JSON.stringify({
          trend,
          changePercent: Math.round(changePercent * 100) / 100,
          firstPeriodAvg: Math.round(firstAvg),
          secondPeriodAvg: Math.round(secondAvg),
          dataPoints: values.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({ error: true, message: `트렌드 분석 실패: ${errorMessage}` });
      }
    },
    {
      name: 'analyze_trends',
      description: '시계열 데이터의 트렌드(상승/하락/안정)를 분석합니다.',
      schema: z.object({
        data: z.string().describe('분석할 JSON 데이터'),
        timeField: z.string().describe('시간 필드명'),
        valueField: z.string().describe('값 필드명'),
      }),
    },
  );

  /**
   * 이상치 탐지 도구
   */
  const detectAnomalies = tool(
    async ({ data, valueField, threshold }) => {
      try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        if (!Array.isArray(parsedData) || parsedData.length === 0) {
          return JSON.stringify({ error: true, message: '분석할 데이터가 없습니다.' });
        }

        const values = parsedData.map((item) => Number(item[valueField]) || 0);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);

        const anomalies = parsedData
          .map((item, index) => {
            const value = Number(item[valueField]) || 0;
            const zScore = (value - mean) / stdDev;
            if (Math.abs(zScore) > (threshold || 2)) {
              return {
                index,
                item,
                value,
                zScore: Math.round(zScore * 100) / 100,
                deviation: zScore > 0 ? 'high' : 'low',
              };
            }
            return null;
          })
          .filter(Boolean);

        return JSON.stringify({
          mean: Math.round(mean),
          stdDev: Math.round(stdDev),
          anomalyCount: anomalies.length,
          anomalies,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({ error: true, message: `이상치 탐지 실패: ${errorMessage}` });
      }
    },
    {
      name: 'detect_anomalies',
      description: '데이터에서 평균에서 크게 벗어난 이상치를 탐지합니다.',
      schema: z.object({
        data: z.string().describe('분석할 JSON 데이터'),
        valueField: z.string().describe('분석할 값 필드명'),
        threshold: z.number().optional().describe('이상치 판정 Z-score 임계값 (기본값: 2)'),
      }),
    },
  );

  /**
   * 기간 비교 도구
   */
  const comparePeriods = tool(
    async ({ currentData, previousData, valueField }) => {
      try {
        const current = typeof currentData === 'string' ? JSON.parse(currentData) : currentData;
        const previous = typeof previousData === 'string' ? JSON.parse(previousData) : previousData;

        const currentTotal = current.reduce(
          (sum: number, item: Record<string, unknown>) => sum + (Number(item[valueField]) || 0),
          0,
        );
        const previousTotal = previous.reduce(
          (sum: number, item: Record<string, unknown>) => sum + (Number(item[valueField]) || 0),
          0,
        );

        const changeAmount = currentTotal - previousTotal;
        const changePercent = previousTotal > 0 ? (changeAmount / previousTotal) * 100 : 0;

        return JSON.stringify({
          currentTotal: Math.round(currentTotal),
          previousTotal: Math.round(previousTotal),
          changeAmount: Math.round(changeAmount),
          changePercent: Math.round(changePercent * 100) / 100,
          trend: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'stable',
          currentCount: current.length,
          previousCount: previous.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({ error: true, message: `기간 비교 실패: ${errorMessage}` });
      }
    },
    {
      name: 'compare_periods',
      description: '두 기간의 데이터를 비교 분석합니다.',
      schema: z.object({
        currentData: z.string().describe('현재 기간 JSON 데이터'),
        previousData: z.string().describe('이전 기간 JSON 데이터'),
        valueField: z.string().describe('비교할 값 필드명'),
      }),
    },
  );

  /**
   * 분포 분석 도구
   */
  const analyzeDistribution = tool(
    async ({ data, valueField, categoryField }) => {
      try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        if (!Array.isArray(parsedData) || parsedData.length === 0) {
          return JSON.stringify({ error: true, message: '분석할 데이터가 없습니다.' });
        }

        const total = parsedData.reduce((sum, item) => sum + (Number(item[valueField]) || 0), 0);

        const distribution = parsedData.map((item) => {
          const value = Number(item[valueField]) || 0;
          return {
            category: item[categoryField] || 'Unknown',
            value,
            percentage: Math.round((value / total) * 10000) / 100,
          };
        });

        // 상위 집중도 계산
        const sorted = [...distribution].sort((a, b) => b.value - a.value);
        const top3Share = sorted.slice(0, 3).reduce((sum, item) => sum + item.percentage, 0);
        const top5Share = sorted.slice(0, 5).reduce((sum, item) => sum + item.percentage, 0);

        return JSON.stringify({
          total,
          itemCount: parsedData.length,
          distribution,
          concentration: {
            top3Share: Math.round(top3Share * 100) / 100,
            top5Share: Math.round(top5Share * 100) / 100,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({ error: true, message: `분포 분석 실패: ${errorMessage}` });
      }
    },
    {
      name: 'analyze_distribution',
      description: '카테고리별 데이터 분포와 점유율을 분석합니다.',
      schema: z.object({
        data: z.string().describe('분석할 JSON 데이터'),
        valueField: z.string().describe('값 필드명'),
        categoryField: z.string().describe('카테고리 필드명'),
      }),
    },
  );

  return { analyzeTrends, detectAnomalies, comparePeriods, analyzeDistribution };
}

export type AnalysisTools = ReturnType<typeof createAnalysisTools>;
