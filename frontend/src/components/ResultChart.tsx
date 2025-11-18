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

export default function ResultChart({ data, type = 'bar' }: ResultChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // 데이터가 숫자 값을 포함하는지 확인
    const keys = Object.keys(data[0]);
    const numericKeys = keys.filter((key) => {
      const value = data[0][key];
      return !isNaN(Number(value)) && value !== null && value !== '';
    });

    if (numericKeys.length === 0) return [];

    // 첫 번째 컬럼을 라벨로, 두 번째 이후를 값으로 사용
    const labelKey = keys[0];
    const valueKeys = numericKeys.length > 0 ? numericKeys : keys.slice(1);

    return data.slice(0, 10).map((item) => {
      const chartItem: Record<string, string | number> = {
        name: String(item[labelKey] ?? '').slice(0, 20), // 라벨 길이 제한
      };

      valueKeys.forEach((key) => {
        chartItem[key] = Number(item[key]) || 0;
      });

      return chartItem;
    });
  }, [data]);

  if (chartData.length === 0) {
    return null;
  }

  const dataKeys = Object.keys(chartData[0]).filter((key) => key !== 'name');

  if (type === 'pie') {
    // Pie 차트는 첫 번째 숫자 필드만 사용
    const pieData = chartData.map((item, index) => ({
      name: item.name,
      value: item[dataKeys[0]],
      fill: COLORS[index % COLORS.length],
    }));

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
            <Tooltip />
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
            <YAxis />
            <Tooltip />
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
          <YAxis />
          <Tooltip />
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
