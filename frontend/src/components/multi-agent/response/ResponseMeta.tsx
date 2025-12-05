import { Clock, Users, Shield, Zap } from 'lucide-react';
import type { ResponseMeta as ResponseMetaType } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  meta: ResponseMetaType;
}

const agentDisplayNames: Record<string, string> = {
  sql_expert: 'SQL 전문가',
  search_expert: '검색 전문가',
  insight_analyst: '인사이트 분석가',
  chart_advisor: '차트 어드바이저',
  followup_agent: '후속 질문 생성',
};

const responseTypeLabels: Record<string, string> = {
  data_only: '데이터 조회',
  data_with_insight: '데이터 + 인사이트',
  full_analysis: '종합 분석',
  search_result: '검색 결과',
  comparison: '비교 분석',
  error: '오류',
};

export default function ResponseMeta({ meta }: Props) {
  const confidenceColor =
    meta.confidence >= 0.8
      ? 'text-emerald-400'
      : meta.confidence >= 0.6
        ? 'text-amber-400'
        : 'text-rose-400';

  return (
    <div className="glass rounded-xl p-4 border border-white/5">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {/* 처리 시간 */}
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-4 h-4" />
          <span>{meta.processingTime.toLocaleString()}ms</span>
        </div>

        {/* 응답 유형 */}
        <div className="flex items-center gap-2 text-slate-400">
          <Zap className="w-4 h-4" />
          <span>{responseTypeLabels[meta.responseType] || meta.responseType}</span>
        </div>

        {/* 신뢰도 */}
        <div className={cn('flex items-center gap-2', confidenceColor)}>
          <Shield className="w-4 h-4" />
          <span>신뢰도 {Math.round(meta.confidence * 100)}%</span>
        </div>

        {/* 사용된 에이전트 */}
        {meta.agentsUsed.length > 0 && (
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="w-4 h-4" />
            <div className="flex flex-wrap gap-1.5">
              {meta.agentsUsed.map((agent) => (
                <span
                  key={agent}
                  className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-medium"
                >
                  {agentDisplayNames[agent] || agent}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 타임스탬프 */}
        <div className="ml-auto text-xs text-slate-500">
          {new Date(meta.timestamp).toLocaleString('ko-KR')}
        </div>
      </div>
    </div>
  );
}
