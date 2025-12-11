import { useQuery } from '@tanstack/react-query';
import { BarChart, Clock, HelpCircle, Info, Search, Server } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number | React.ReactNode;
  subtitle?: string;
  color?: 'blue' | 'purple' | 'emerald' | 'amber';
}

interface HistoryItem {
  result?: {
    executionTime?: number;
  };
}

function MetricCard({ icon, title, value, subtitle, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-600 to-indigo-600 shadow-blue-500/20',
    purple: 'from-purple-600 to-pink-600 shadow-purple-500/20',
    emerald: 'from-emerald-600 to-teal-600 shadow-emerald-500/20',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/20',
  };

  return (
    <div className="glass rounded-2xl p-6 hover:bg-white/10 transition-all">
      <div className="flex items-start gap-4">
        <div className={`bg-gradient-to-br ${colorClasses[color]} p-3 rounded-xl shadow-lg`}>{icon}</div>
        <div className="flex-1">
          <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState({
    totalQueries: 0,
    averageTime: 0,
  });

  const { data: healthStatus, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.checkHealth(),
    refetchInterval: 30000, // 30초마다 체크
    retry: 1,
  });

  useEffect(() => {
    const history: HistoryItem[] = JSON.parse(localStorage.getItem('query_history') || '[]');

    const totalQueries = history.length;
    const totalTime = history.reduce((sum, item) => sum + (item.result?.executionTime || 0), 0);
    const averageTime = totalQueries > 0 ? Math.round(totalTime / totalQueries) : 0;

    setMetrics({
      totalQueries,
      averageTime,
    });
  }, []);

  const getStatusBadge = () => {
    if (healthLoading) {
      return <span className="text-sm text-slate-500">확인 중...</span>;
    }
    if (healthStatus?.status === 'ok') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          정상
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
        오류
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="glass p-8 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-3">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-xl shadow-lg shadow-amber-500/20">
            <BarChart className="w-5 h-5 text-white" />
          </div>
          메트릭 대시보드
        </h2>
        <p className="text-slate-400 leading-relaxed">시스템 사용 통계 및 성능 메트릭</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<HelpCircle className="w-5 h-5 text-white" />}
          title="총 질의 수"
          value={metrics.totalQueries}
          subtitle="저장된 전체 질의"
          color="blue"
        />

        <MetricCard
          icon={<Search className="w-5 h-5 text-white" />}
          title="검색 수"
          value={metrics.totalQueries}
          subtitle="시맨틱 + 하이브리드"
          color="purple"
        />

        <MetricCard
          icon={<Clock className="w-5 h-5 text-white" />}
          title="평균 응답시간"
          value={metrics.averageTime > 0 ? `${metrics.averageTime}ms` : '-'}
          subtitle={metrics.totalQueries > 0 ? `${metrics.totalQueries}건 기준` : '데이터 없음'}
          color="emerald"
        />

        <MetricCard
          icon={<Server className="w-5 h-5 text-white" />}
          title="API 상태"
          value={getStatusBadge()}
          subtitle={healthLoading ? '상태 확인 중...' : '자동 갱신: 30초'}
          color="amber"
        />
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">시스템 정보</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-white/10">
            <span className="text-slate-400">프론트엔드</span>
            <span className="font-medium text-slate-200">React + Vite + TypeScript</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/10">
            <span className="text-slate-400">백엔드</span>
            <span className="font-medium text-slate-200">NestJS + TypeORM</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/10">
            <span className="text-slate-400">AI 엔진</span>
            <span className="font-medium text-slate-200">AWS Bedrock (Claude 3 Sonnet)</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/10">
            <span className="text-slate-400">벡터 DB</span>
            <span className="font-medium text-slate-200">Amazon OpenSearch Serverless</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/10">
            <span className="text-slate-400">데이터베이스</span>
            <span className="font-medium text-slate-200">GCP Cloud SQL (MySQL)</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-slate-400">상태 관리</span>
            <span className="font-medium text-slate-200">TanStack Query</span>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 border border-blue-500/20 bg-blue-500/5">
        <p className="text-sm text-blue-300 flex items-start gap-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Note:</strong> 메트릭은 브라우저 LocalStorage 기반으로 계산됩니다. 실제 프로덕션 환경에서는 서버
            기반 메트릭 수집을 권장합니다.
          </span>
        </p>
      </div>
    </div>
  );
}
