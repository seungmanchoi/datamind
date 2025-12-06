import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Percent,
  Target,
  Award,
  AlertCircle,
  Sparkles,
  Activity,
} from 'lucide-react';
import type { InsightItem, InsightType } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  insight: InsightItem;
}

const insightTypeConfig: Record<
  InsightType,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  summary: { icon: Sparkles, color: 'text-primary', bgColor: 'bg-primary/20', label: '요약' },
  trend: { icon: Activity, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', label: '트렌드' },
  comparison: { icon: BarChart3, color: 'text-violet-400', bgColor: 'bg-violet-500/20', label: '비교' },
  anomaly: { icon: AlertTriangle, color: 'text-amber-400', bgColor: 'bg-amber-500/20', label: '이상치' },
  ranking: { icon: Award, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: '순위' },
  distribution: { icon: Percent, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', label: '분포' },
  correlation: { icon: Activity, color: 'text-pink-400', bgColor: 'bg-pink-500/20', label: '상관관계' },
  prediction: { icon: Target, color: 'text-sky-400', bgColor: 'bg-sky-500/20', label: '예측' },
  recommendation: { icon: Lightbulb, color: 'text-lime-400', bgColor: 'bg-lime-500/20', label: '추천' },
  warning: { icon: AlertCircle, color: 'text-rose-400', bgColor: 'bg-rose-500/20', label: '경고' },
  opportunity: { icon: Sparkles, color: 'text-teal-400', bgColor: 'bg-teal-500/20', label: '기회' },
  benchmark: { icon: BarChart3, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', label: '벤치마크' },
};

const importanceConfig = {
  high: { border: 'border-l-rose-400', bg: 'bg-rose-500/5' },
  medium: { border: 'border-l-amber-400', bg: 'bg-amber-500/5' },
  low: { border: 'border-l-slate-400', bg: 'bg-slate-500/5' },
};

export default function InsightCard({ insight }: Props) {
  const typeConfig = insightTypeConfig[insight.type] || insightTypeConfig.summary;
  const importance = importanceConfig[insight.importance];
  const Icon = typeConfig.icon;

  const TrendIcon =
    insight.trend === 'up' ? TrendingUp : insight.trend === 'down' ? TrendingDown : Minus;

  const trendColor =
    insight.trend === 'up'
      ? 'text-emerald-400'
      : insight.trend === 'down'
        ? 'text-rose-400'
        : 'text-slate-400';

  return (
    <div
      className={cn(
        'glass rounded-xl p-4 border-l-4 transition-all hover:shadow-lg',
        importance.border,
        importance.bg
      )}
    >
      <div className="flex items-start gap-3">
        {/* 아이콘 */}
        <div className={cn('p-2 rounded-lg flex-shrink-0', typeConfig.bgColor)}>
          <Icon className={cn('w-5 h-5', typeConfig.color)} />
        </div>

        <div className="flex-1 min-w-0">
          {/* 헤더 */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-white truncate">{insight.title}</h4>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full flex-shrink-0',
                typeConfig.bgColor,
                typeConfig.color
              )}
            >
              {typeConfig.label}
            </span>
          </div>

          {/* 본문 */}
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{insight.content}</p>

          {/* 트렌드 및 변화율 */}
          {(insight.trend || insight.changePercent !== undefined) && (
            <div className="flex items-center gap-3 mt-3">
              {insight.trend && (
                <div className={cn('flex items-center gap-1', trendColor)}>
                  <TrendIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {insight.trend === 'up' ? '상승' : insight.trend === 'down' ? '하락' : '유지'}
                  </span>
                </div>
              )}
              {insight.changePercent !== undefined && (
                <span className={cn('text-sm font-semibold', trendColor)}>
                  {insight.changePercent > 0 ? '+' : ''}
                  {insight.changePercent.toFixed(1)}%
                </span>
              )}
              {insight.comparedTo && (
                <span className="text-xs text-slate-500">vs {insight.comparedTo}</span>
              )}
            </div>
          )}

          {/* 메타 정보 */}
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
            <span>신뢰도 {Math.round(insight.confidence * 100)}%</span>
            {insight.actionable && (
              <span className="text-primary font-medium">실행 가능</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
