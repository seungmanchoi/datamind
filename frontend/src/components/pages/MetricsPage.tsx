import { useState, useEffect } from 'react';
import { BarChart, HelpCircle, Search, Clock, Server } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number | React.ReactNode;
  subtitle?: string;
}

interface HistoryItem {
  result?: {
    executionTime?: number;
  };
}

function MetricCard({ icon, title, value, subtitle }: MetricCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-50 rounded-lg text-blue-600">{icon}</div>
        <div className="flex-1">
          <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
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
    const history: HistoryItem[] = JSON.parse(
      localStorage.getItem('query_history') || '[]'
    );

    const totalQueries = history.length;
    const totalTime = history.reduce(
      (sum, item) => sum + (item.result?.executionTime || 0),
      0
    );
    const averageTime = totalQueries > 0 ? Math.round(totalTime / totalQueries) : 0;

    setMetrics({
      totalQueries,
      averageTime,
    });
  }, []);

  const getStatusBadge = () => {
    if (healthLoading) {
      return <span className="text-sm text-gray-500">확인 중...</span>;
    }
    if (healthStatus?.status === 'ok') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          정상
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        오류
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-lg border border-orange-100">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-2">
          <BarChart className="w-6 h-6 text-orange-600" />
          메트릭 대시보드
        </h2>
        <p className="text-gray-600">시스템 사용 통계 및 성능 메트릭</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={<HelpCircle className="w-6 h-6" />}
          title="총 질의 수"
          value={metrics.totalQueries}
          subtitle="저장된 전체 질의"
        />

        <MetricCard
          icon={<Search className="w-6 h-6" />}
          title="검색 수"
          value={metrics.totalQueries}
          subtitle="시맨틱 + 하이브리드"
        />

        <MetricCard
          icon={<Clock className="w-6 h-6" />}
          title="평균 응답시간"
          value={metrics.averageTime > 0 ? `${metrics.averageTime}ms` : '-'}
          subtitle={
            metrics.totalQueries > 0 ? `${metrics.totalQueries}건 기준` : '데이터 없음'
          }
        />

        <MetricCard
          icon={<Server className="w-6 h-6" />}
          title="API 상태"
          value={getStatusBadge()}
          subtitle={healthLoading ? '상태 확인 중...' : '자동 갱신: 30초'}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">시스템 정보</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">프론트엔드</span>
            <span className="font-medium text-gray-800">React + Vite + TypeScript</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">백엔드</span>
            <span className="font-medium text-gray-800">NestJS + TypeORM</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">AI 엔진</span>
            <span className="font-medium text-gray-800">
              AWS Bedrock (Claude 3 Sonnet)
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">벡터 DB</span>
            <span className="font-medium text-gray-800">
              Amazon OpenSearch Serverless
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">데이터베이스</span>
            <span className="font-medium text-gray-800">GCP Cloud SQL (MySQL)</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-600">상태 관리</span>
            <span className="font-medium text-gray-800">TanStack Query</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> 메트릭은 브라우저 LocalStorage 기반으로 계산됩니다. 실제
          프로덕션 환경에서는 서버 기반 메트릭 수집을 권장합니다.
        </p>
      </div>
    </div>
  );
}
