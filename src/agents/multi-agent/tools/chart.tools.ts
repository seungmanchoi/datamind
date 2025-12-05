import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { ChartConfig, ChartType } from '@/dto/response/multi-agent-response.dto';

// 차트 색상 팔레트
const CHART_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
];

/**
 * 차트 도구 생성 팩토리
 */
export function createChartTools() {
  /**
   * 차트 유형 추천 도구
   */
  const recommendChart = tool(
    async ({ data, dataDescription, purpose }) => {
      try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        if (!Array.isArray(parsedData) || parsedData.length === 0) {
          return JSON.stringify({
            recommended: false,
            reason: '시각화할 데이터가 없습니다.',
          });
        }

        const itemCount = parsedData.length;
        const keys = Object.keys(parsedData[0]);
        const hasTimeField = keys.some((k) =>
          ['date', 'time', 'created_at', 'updated_at', 'month', 'year', 'day', 'week'].includes(k.toLowerCase()),
        );
        const hasNumericValues = keys.some((k) => typeof parsedData[0][k] === 'number');

        let primaryType: ChartType = 'bar';
        let alternatives: ChartType[] = [];
        let reason = '';

        // 목적 기반 추천
        const lowerPurpose = purpose?.toLowerCase() || '';
        const lowerDesc = dataDescription?.toLowerCase() || '';

        if (lowerPurpose.includes('비교') || lowerDesc.includes('비교')) {
          if (itemCount <= 7) {
            primaryType = 'bar';
            alternatives = ['horizontal_bar', 'table'];
            reason = '항목 수가 적어 막대 차트로 비교가 효과적입니다.';
          } else {
            primaryType = 'horizontal_bar';
            alternatives = ['bar', 'table'];
            reason = '항목이 많아 가로 막대 차트가 가독성이 좋습니다.';
          }
        } else if (hasTimeField || lowerPurpose.includes('추이') || lowerDesc.includes('추이')) {
          primaryType = 'line';
          alternatives = ['area', 'bar'];
          reason = '시계열 데이터는 선 차트로 트렌드 파악이 용이합니다.';
        } else if (lowerPurpose.includes('구성') || lowerPurpose.includes('비율') || lowerDesc.includes('점유')) {
          if (itemCount <= 5) {
            primaryType = 'pie';
            alternatives = ['donut', 'bar'];
            reason = '구성비 표시에는 파이 차트가 직관적입니다.';
          } else {
            primaryType = 'donut';
            alternatives = ['horizontal_bar', 'treemap'];
            reason = '항목이 많아 도넛 차트 또는 가로 막대를 추천합니다.';
          }
        } else if (lowerPurpose.includes('분포') || lowerDesc.includes('분포')) {
          primaryType = 'scatter';
          alternatives = ['heatmap', 'bar'];
          reason = '데이터 분포 확인에는 산점도가 적합합니다.';
        } else if (lowerPurpose.includes('순위') || lowerPurpose.includes('top') || lowerDesc.includes('top')) {
          primaryType = 'horizontal_bar';
          alternatives = ['bar', 'table'];
          reason = '순위 표시에는 가로 막대 차트가 효과적입니다.';
        } else {
          // 기본 추천
          if (itemCount <= 10 && hasNumericValues) {
            primaryType = 'bar';
            alternatives = ['horizontal_bar', 'table'];
            reason = '일반적인 데이터에는 막대 차트가 적합합니다.';
          } else {
            primaryType = 'table';
            alternatives = ['horizontal_bar'];
            reason = '데이터가 많아 테이블로 상세 정보를 표시합니다.';
          }
        }

        return JSON.stringify({
          recommended: true,
          primaryType,
          alternatives,
          reason,
          dataCharacteristics: {
            itemCount,
            hasTimeField,
            hasNumericValues,
            fields: keys,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          recommended: false,
          reason: `차트 추천 실패: ${errorMessage}`,
        });
      }
    },
    {
      name: 'recommend_chart',
      description: '데이터 특성을 분석하여 최적의 차트 유형을 추천합니다.',
      schema: z.object({
        data: z.string().describe('시각화할 JSON 데이터'),
        dataDescription: z.string().optional().describe('데이터에 대한 설명'),
        purpose: z.string().optional().describe('시각화 목적 (비교, 추이, 구성비 등)'),
      }),
    },
  );

  /**
   * 차트 데이터 준비 도구
   */
  const prepareChartData = tool(
    async ({ data, chartType, labelField, valueField, title }) => {
      try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        if (!Array.isArray(parsedData) || parsedData.length === 0) {
          return JSON.stringify({ error: true, message: '차트 데이터가 없습니다.' });
        }

        const labels = parsedData.map((item) => String(item[labelField] || 'Unknown'));
        const values = parsedData.map((item) => Number(item[valueField]) || 0);

        const chartConfig: ChartConfig = {
          id: `chart_${Date.now()}`,
          type: chartType as ChartType,
          title: title || '차트',
          data: {
            labels,
            datasets: [
              {
                label: valueField,
                data: values,
                backgroundColor:
                  chartType === 'pie' || chartType === 'donut' ? CHART_COLORS.slice(0, labels.length) : CHART_COLORS[0],
                borderColor: chartType === 'line' ? CHART_COLORS[0] : undefined,
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: chartType === 'horizontal_bar' ? 'y' : 'x',
            plugins: {
              legend: {
                display: chartType === 'pie' || chartType === 'donut' || chartType === 'line',
              },
              tooltip: {
                enabled: true,
              },
            },
          },
          interactions: {
            clickable: true,
            hoverable: true,
            zoomable: false,
            downloadable: true,
          },
        };

        return JSON.stringify(chartConfig);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({ error: true, message: `차트 데이터 준비 실패: ${errorMessage}` });
      }
    },
    {
      name: 'prepare_chart_data',
      description: '차트 라이브러리에서 바로 사용할 수 있는 형식으로 데이터를 변환합니다.',
      schema: z.object({
        data: z.string().describe('차트로 변환할 JSON 데이터'),
        chartType: z.enum(['bar', 'horizontal_bar', 'line', 'area', 'pie', 'donut', 'scatter']).describe('차트 유형'),
        labelField: z.string().describe('라벨(X축)로 사용할 필드명'),
        valueField: z.string().describe('값(Y축)으로 사용할 필드명'),
        title: z.string().optional().describe('차트 제목'),
      }),
    },
  );

  /**
   * KPI 카드 데이터 생성 도구
   */
  const createMetricCard = tool(
    async ({ title, value, format, previousValue, icon }) => {
      const numValue = Number(value) || 0;
      const numPrevValue = previousValue ? Number(previousValue) : null;

      let change: number | null = null;
      let changeType: 'increase' | 'decrease' | 'stable' | null = null;

      if (numPrevValue !== null && numPrevValue !== 0) {
        change = Math.round(((numValue - numPrevValue) / numPrevValue) * 10000) / 100;
        changeType = change > 0 ? 'increase' : change < 0 ? 'decrease' : 'stable';
      }

      // 값 포맷팅
      let formattedValue = String(numValue);
      if (format === 'currency') {
        formattedValue = new Intl.NumberFormat('ko-KR', {
          style: 'currency',
          currency: 'KRW',
          maximumFractionDigits: 0,
        }).format(numValue);
      } else if (format === 'number') {
        formattedValue = new Intl.NumberFormat('ko-KR').format(numValue);
      } else if (format === 'percentage') {
        formattedValue = `${numValue}%`;
      }

      return JSON.stringify({
        type: 'metric_card',
        data: {
          title,
          value: numValue,
          formattedValue,
          format,
          change,
          changeType,
          icon,
        },
      });
    },
    {
      name: 'create_metric_card',
      description: 'KPI 지표를 표시하는 메트릭 카드 데이터를 생성합니다.',
      schema: z.object({
        title: z.string().describe('지표 제목'),
        value: z.number().describe('현재 값'),
        format: z.enum(['currency', 'number', 'percentage']).describe('값 포맷'),
        previousValue: z.number().optional().describe('이전 값 (변화율 계산용)'),
        icon: z.string().optional().describe('아이콘 (이모지)'),
      }),
    },
  );

  return { recommendChart, prepareChartData, createMetricCard };
}

export type ChartTools = ReturnType<typeof createChartTools>;
