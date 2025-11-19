import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { type QueryResult } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface ResultChartProps {
  data: QueryResult[];
  type?: 'bar' | 'line' | 'pie';
}

const COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#6366F1',
  '#14B8A6',
];

/**
 * 금액 관련 필드인지 판단
 */
function isCurrencyField(key: string): boolean {
  const currencyPatterns = [
    'price',
    'amount',
    '금액',
    '매출',
    '판매',
    '수익',
    'revenue',
    'sales',
    'total',
    '합계',
    '평균',
  ];
  const lowerKey = key.toLowerCase();
  return currencyPatterns.some((pattern) => lowerKey.includes(pattern.toLowerCase()));
}

/**
 * 최적의 라벨 키 선택 (name 필드 우선)
 */
function selectLabelKey(keys: string[]): string {
  // 1순위: _name으로 끝나는 필드 (product_name, market_name 등)
  const nameField = keys.find((key) => key.endsWith('_name') || key.endsWith('Name'));
  if (nameField) return nameField;

  // 2순위: 'name'이 포함된 필드
  const nameContaining = keys.find((key) => key.toLowerCase().includes('name'));
  if (nameContaining) return nameContaining;

  // 3순위: '이름', '명' 등 한글 이름 필드
  const koreanName = keys.find((key) => key.includes('이름') || key.includes('명'));
  if (koreanName) return koreanName;

  // 기본값: 첫 번째 필드
  return keys[0];
}

export default function ResultChart({ data, type = 'bar' }: ResultChartProps) {
  const { chartData, currencyKeys } = useMemo(() => {
    if (!data || data.length === 0) return { chartData: [], currencyKeys: [] };

    // 데이터가 숫자 값을 포함하는지 확인
    const keys = Object.keys(data[0]);
    const numericKeys = keys.filter((key) => {
      const value = data[0][key];
      return !isNaN(Number(value)) && value !== null && value !== '';
    });

    if (numericKeys.length === 0) return { chartData: [], currencyKeys: [] };

    // 최적의 라벨 키 선택 (name 필드 우선)
    const labelKey = selectLabelKey(keys);
    const valueKeys = numericKeys.length > 0 ? numericKeys : keys.slice(1);

    // 금액 필드 식별
    const currencyKeys = valueKeys.filter(isCurrencyField);

    const processedData = data.slice(0, 10).map((item) => {
      const chartItem: Record<string, string | number> = {
        name: String(item[labelKey] ?? '').slice(0, 30), // 라벨 길이 제한 증가
      };

      valueKeys.forEach((key) => {
        chartItem[key] = Number(item[key]) || 0;
      });

      return chartItem;
    });

    return { chartData: processedData, currencyKeys };
  }, [data]);

  if (chartData.length === 0) {
    return null;
  }

  const dataKeys = Object.keys(chartData[0]).filter((key) => key !== 'name');

  // Tooltip 커스텀 포맷터
  const formatTooltipValue = (value: number, name: string) => {
    if (currencyKeys.includes(name)) {
      return formatCurrency(value);
    }
    return formatNumber(value);
  };

  // YAxis 커스텀 포맷터
  const formatYAxisTick = (value: number) => {
    // Y축에 금액 필드가 있으면 간단하게 표시 (억, 만 단위)
    if (currencyKeys.length > 0) {
      if (value >= 100000000) {
        return `${(value / 100000000).toFixed(1)}억`;
      }
      if (value >= 10000) {
        return `${(value / 10000).toFixed(0)}만`;
      }
      return `${value.toLocaleString('ko-KR')}`;
    }
    return formatNumber(value);
  };

  if (type === 'pie') {
    // Pie 차트는 첫 번째 숫자 필드만 사용
    const pieData = chartData.map((item, index) => ({
      name: item.name,
      value: item[dataKeys[0]],
      fill: COLORS[index % COLORS.length],
    }));

    const pieTooltipFormatter = (value: number) => {
      if (currencyKeys.includes(dataKeys[0])) {
        return formatCurrency(value);
      }
      return formatNumber(value);
    };

    return (
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          데이터 시각화 (Pie Chart)
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={pieTooltipFormatter} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          데이터 시각화 (Line Chart)
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis tickFormatter={formatYAxisTick} />
            <Tooltip formatter={formatTooltipValue} />
            <Legend />
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Bar 차트 (기본)
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">
        데이터 시각화 (Bar Chart)
      </h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
          <YAxis tickFormatter={formatYAxisTick} />
          <Tooltip formatter={formatTooltipValue} />
          <Legend />
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
