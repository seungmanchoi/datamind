import { Sparkles, Shield } from 'lucide-react';
import type { InsightItem } from '@/lib/api';
import InsightCard from './InsightCard';
import { cn } from '@/lib/utils';

interface Props {
  summary: string;
  items: InsightItem[];
  overallConfidence: number;
}

export default function InsightsList({ summary, items, overallConfidence }: Props) {
  const confidenceColor =
    overallConfidence >= 0.8
      ? 'text-emerald-400'
      : overallConfidence >= 0.6
        ? 'text-amber-400'
        : 'text-rose-400';

  // 중요도별 정렬
  const sortedItems = [...items].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.importance] - order[b.importance];
  });

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-primary/20 to-indigo-600/20 px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/30 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-white">AI 인사이트</h3>
          </div>
          <div className={cn('flex items-center gap-2', confidenceColor)}>
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">
              전체 신뢰도 {Math.round(overallConfidence * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* 요약 */}
      {summary && (
        <div className="px-6 py-4 border-b border-white/5">
          <p className="text-slate-200 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* 인사이트 목록 */}
      <div className="p-6">
        {sortedItems.length > 0 ? (
          <div className="grid gap-4">
            {sortedItems.map((item) => (
              <InsightCard key={item.id} insight={item} />
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-400 py-8">분석된 인사이트가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
