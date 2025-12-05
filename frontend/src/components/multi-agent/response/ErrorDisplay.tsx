import { AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';
import type { ErrorSection } from '@/lib/api';

interface Props {
  error: ErrorSection;
  onRetry?: () => void;
}

const errorCodeLabels: Record<string, string> = {
  WORKFLOW_ERROR: '워크플로우 오류',
  SQL_ERROR: 'SQL 실행 오류',
  SEARCH_ERROR: '검색 오류',
  TIMEOUT: '시간 초과',
  VALIDATION_ERROR: '검증 오류',
};

export default function ErrorDisplay({ error, onRetry }: Props) {
  return (
    <div className="glass rounded-2xl border border-rose-500/30 overflow-hidden">
      {/* 헤더 */}
      <div className="bg-rose-500/10 px-6 py-4 border-b border-rose-500/20">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/20 p-2 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-rose-400">오류가 발생했습니다</h3>
            <p className="text-sm text-rose-400/70">
              {errorCodeLabels[error.code] || error.code}
            </p>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="p-6 space-y-4">
        <p className="text-slate-300">{error.message}</p>

        {error.details && (
          <div className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
            <p className="text-sm text-slate-400 font-mono">{error.details}</p>
          </div>
        )}

        {error.suggestion && (
          <div className="flex items-start gap-3 bg-primary/10 rounded-lg p-4 border border-primary/20">
            <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-slate-300">{error.suggestion}</p>
          </div>
        )}

        {/* 재시도 버튼 */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10
                     text-slate-300 rounded-lg transition-colors border border-white/10"
          >
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}
