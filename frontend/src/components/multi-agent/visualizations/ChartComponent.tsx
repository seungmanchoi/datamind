import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CreditCard,
  Info,
  LineChart as LineChartIcon,
  Minus,
  PieChart as PieChartIcon,
  Table as TableIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { ChartConfig, ChartType } from '@/lib/api';
import { cn } from '@/lib/utils';

// Metric Card 데이터 타입
interface MetricCardData {
  title?: string;
  value?: number;
  formattedValue?: string;
  format?: string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral' | null;
  icon?: string;
}

interface Props {
  config: ChartConfig;
  reason?: string;
  alternatives?: ChartConfig[];
}

const COLORS = [
  '#6366f1', // Indigo 500
  '#10b981', // Emerald 500
  '#f472b6', // Pink 400
  '#8b5cf6', // Violet 500
  '#3b82f6', // Blue 500
  '#ec4899', // Pink 500
  '#14b8a6', // Teal 500
  '#f59e0b', // Amber 500
];

const chartTypeIcons: Record<string, React.ElementType> = {
  bar: BarChart3,
  horizontal_bar: BarChart3,
  line: LineChartIcon,
  area: LineChartIcon,
  pie: PieChartIcon,
  donut: PieChartIcon,
  metric_card: CreditCard,
  table: TableIcon,
};

export default function ChartComponent({ config, reason, alternatives }: Props) {
  const [selectedType, setSelectedType] = useState<ChartType>(config.type);
  const Icon = chartTypeIcons[selectedType] || BarChart3;

  // 차트 데이터 변환
  const chartData = useMemo(() => {
    const { labels, datasets } = config.data;
    if (!labels || !datasets.length) return [];

    return labels.map((label, index) => {
      const dataPoint: Record<string, string | number> = { name: label };
      datasets.forEach((dataset) => {
        dataPoint[dataset.label] = dataset.data[index] ?? 0;
      });
      return dataPoint;
    });
  }, [config.data]);

  // 파이 차트용 데이터 변환
  const pieData = useMemo(() => {
    const { labels, datasets } = config.data;
    if (!labels || !datasets.length) return [];

    return labels.map((label, index) => ({
      name: label,
      value: datasets[0]?.data[index] ?? 0,
    }));
  }, [config.data]);

  const renderChart = () => {
    const datasets = config.data.datasets;

    switch (selectedType) {
      case 'bar':
      case 'horizontal_bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              layout={selectedType === 'horizontal_bar' ? 'vertical' : 'horizontal'}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              {selectedType === 'horizontal_bar' ? (
                <>
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} />
                </>
              ) : (
                <>
                  <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} interval={0} />
                  <YAxis stroke="#9ca3af" />
                </>
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {datasets.map((dataset, index) => (
                <Bar
                  key={dataset.label}
                  dataKey={dataset.label}
                  fill={COLORS[index % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {datasets.map((dataset, index) => (
                <Line
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[index % COLORS.length] }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {datasets.map((dataset, index) => (
                <Area
                  key={dataset.label}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={selectedType === 'donut' ? 80 : 0}
                outerRadius={140}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'metric_card': {
        // metric_card 데이터 처리 - config.data가 배열이거나 단일 객체일 수 있음
        const metricData = config.data as unknown as MetricCardData | MetricCardData[];
        const metrics = Array.isArray(metricData) ? metricData : [metricData];

        // 데이터가 없거나 유효하지 않으면 기본 카드 표시
        if (!metrics.length || !metrics[0]?.title) {
          return (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <div className="text-center">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>메트릭 데이터가 없습니다</p>
              </div>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric, index) => {
              const ChangeIcon =
                metric.changeType === 'increase'
                  ? ArrowUp
                  : metric.changeType === 'decrease'
                    ? ArrowDown
                    : Minus;
              const changeColor =
                metric.changeType === 'increase'
                  ? 'text-emerald-400'
                  : metric.changeType === 'decrease'
                    ? 'text-rose-400'
                    : 'text-slate-400';

              return (
                <div
                  key={index}
                  className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{metric.icon || '📊'}</span>
                    {metric.change != null && (
                      <div className={cn('flex items-center gap-1 text-sm', changeColor)}>
                        <ChangeIcon className="w-4 h-4" />
                        <span>{Math.abs(metric.change)}%</span>
                      </div>
                    )}
                  </div>
                  <h4 className="text-sm text-slate-400 mb-1">{metric.title}</h4>
                  <p className="text-2xl font-bold text-white">
                    {metric.formattedValue ||
                      (metric.value != null ? metric.value.toLocaleString() : '-')}
                  </p>
                </div>
              );
            })}
          </div>
        );
      }

      case 'table': {
        // 테이블 차트 - chartData 사용
        if (!chartData.length) {
          return (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <div className="text-center">
                <TableIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>테이블 데이터가 없습니다</p>
              </div>
            </div>
          );
        }

        const columns = Object.keys(chartData[0] || {});

        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-slate-400 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-3 text-white">
                        {typeof row[col] === 'number'
                          ? (row[col] as number).toLocaleString()
                          : String(row[col] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      default:
        return (
          <div className="flex items-center justify-center h-64 text-slate-400">
            지원하지 않는 차트 유형입니다: {selectedType}
          </div>
        );
    }
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{config.title}</h3>
              {config.subtitle && <p className="text-sm text-slate-400">{config.subtitle}</p>}
            </div>
          </div>

          {/* 차트 타입 선택 */}
          <div className="flex items-center gap-2">
            {(['bar', 'line', 'pie'] as ChartType[]).map((type) => {
              const TypeIcon = chartTypeIcons[type] || BarChart3;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    selectedType === type
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10',
                  )}
                  title={type}
                >
                  <TypeIcon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 추천 이유 */}
        {reason && (
          <div className="flex items-start gap-2 mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-300">{reason}</p>
          </div>
        )}
      </div>

      {/* 차트 본문 */}
      <div className="p-6">{renderChart()}</div>

      {/* 대안 차트 */}
      {alternatives && alternatives.length > 0 && (
        <div className="px-6 pb-6">
          <p className="text-sm text-slate-500 mb-2">다른 시각화 옵션:</p>
          <div className="flex gap-2">
            {alternatives.map((alt) => (
              <button
                key={alt.id}
                onClick={() => setSelectedType(alt.type)}
                className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10
                         text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                {alt.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
