import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Code2,
  Copy,
  Database,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

import { api, type FailedQueryItem } from '@/lib/api';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

type StatusFilter = 'all' | 'pending' | 'resolved' | 'ignored';

export default function FailedQueriesPage() {
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resolveForm, setResolveForm] = useState({
    sql: '',
    description: '',
    embedToRag: true,
  });

  // 실패 쿼리 목록 조회
  const {
    data: failedQueriesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['failed-queries', currentPage, statusFilter],
    queryFn: () =>
      api.getFailedQueries(currentPage, PAGE_SIZE, statusFilter === 'all' ? undefined : statusFilter),
  });

  // 인덱스 초기화
  const setupMutation = useMutation({
    mutationFn: () => api.setupQueryLearning(),
    onSuccess: (data) => {
      alert(data.message);
    },
    onError: (error) => {
      console.error('Setup error:', error);
      alert('인덱스 초기화 중 오류가 발생했습니다.');
    },
  });

  // 해결 처리
  const resolveMutation = useMutation({
    mutationFn: ({ id, sql, description, embedToRag }: { id: string; sql: string; description: string; embedToRag: boolean }) =>
      api.resolveFailedQuery(id, sql, description, embedToRag),
    onSuccess: () => {
      setResolvingId(null);
      setResolveForm({ sql: '', description: '', embedToRag: true });
      queryClient.invalidateQueries({ queryKey: ['failed-queries'] });
      alert('쿼리가 성공적으로 해결되었습니다.');
    },
    onError: (error) => {
      console.error('Resolve error:', error);
      alert('해결 처리 중 오류가 발생했습니다.');
    },
  });

  // 무시 처리
  const ignoreMutation = useMutation({
    mutationFn: (id: string) => api.ignoreFailedQuery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failed-queries'] });
      alert('쿼리가 무시 처리되었습니다.');
    },
    onError: (error) => {
      console.error('Ignore error:', error);
      alert('무시 처리 중 오류가 발생했습니다.');
    },
  });

  // 삭제
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteFailedQuery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failed-queries'] });
      if (failedQueriesData?.data?.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
      alert('쿼리가 삭제되었습니다.');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    },
  });

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleResolve = (item: FailedQueryItem) => {
    setResolvingId(item.id);
    // 마지막 시도한 SQL로 초기화
    const lastAttempt = item.attempts[item.attempts.length - 1];
    setResolveForm({
      sql: lastAttempt?.sql || item.failedSql,
      description: item.originalQuery,
      embedToRag: true,
    });
  };

  const submitResolve = () => {
    if (!resolvingId || !resolveForm.sql.trim() || !resolveForm.description.trim()) {
      alert('SQL과 설명을 모두 입력해주세요.');
      return;
    }
    resolveMutation.mutate({
      id: resolvingId,
      sql: resolveForm.sql,
      description: resolveForm.description,
      embedToRag: resolveForm.embedToRag,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            대기 중
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            해결됨
          </span>
        );
      case 'ignored':
        return (
          <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded-full flex items-center gap-1">
            <Ban className="w-3 h-3" />
            무시됨
          </span>
        );
      default:
        return null;
    }
  };

  const formatSql = (sql: string) => {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
      'ON', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'AS',
      'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'DISTINCT', 'IN', 'NOT', 'NULL',
      'IS', 'LIKE', 'BETWEEN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    ];

    let formatted = sql;
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, `<span class="text-blue-400 font-semibold">${keyword}</span>`);
    });

    return formatted;
  };

  const totalPages = failedQueriesData?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 p-3 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">실패 쿼리 관리</h1>
              <p className="text-sm text-slate-400">
                자동 보정에 실패한 쿼리를 수동으로 해결하고 RAG에 학습시킬 수 있습니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setupMutation.mutate()}
              disabled={setupMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600/30 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
            >
              {setupMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              인덱스 초기화
            </button>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              새로고침
            </button>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">상태 필터:</span>
          {(['all', 'pending', 'resolved', 'ignored'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setCurrentPage(1);
              }}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50',
              )}
            >
              {status === 'all' ? '전체' : status === 'pending' ? '대기 중' : status === 'resolved' ? '해결됨' : '무시됨'}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code2 className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white">실패 쿼리 목록</span>
              {failedQueriesData && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                  {failedQueriesData.total}개
                </span>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !failedQueriesData?.data?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4" />
            <p className="text-lg font-medium text-white mb-2">실패 쿼리가 없습니다</p>
            <p className="text-sm text-slate-400">모든 쿼리가 정상적으로 처리되었거나 아직 학습 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {failedQueriesData.data.map((item) => {
              const isExpanded = expandedId === item.id;
              const isResolving = resolvingId === item.id;

              return (
                <div
                  key={item.id}
                  className={cn(
                    'glass rounded-xl overflow-hidden border transition-all',
                    item.status === 'pending' ? 'border-amber-500/20' :
                    item.status === 'resolved' ? 'border-emerald-500/20' : 'border-slate-500/20',
                  )}
                >
                  {/* 헤더 */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        item.status === 'pending' ? 'bg-amber-500/20' :
                        item.status === 'resolved' ? 'bg-emerald-500/20' : 'bg-slate-500/20',
                      )}>
                        {item.status === 'pending' ? (
                          <XCircle className="w-4 h-4 text-amber-400" />
                        ) : item.status === 'resolved' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Ban className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.originalQuery}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {getStatusBadge(item.status)}
                          <span className="text-xs text-slate-500">
                            시도: {item.attempts.length}회
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                  </button>

                  {/* 상세 내용 */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-white/5">
                      {/* 원본 정보 */}
                      <div className="pt-4 space-y-3">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">사용자 질문:</p>
                          <p className="text-sm text-white bg-slate-900/50 rounded-lg p-3">
                            {item.userQuestion || item.originalQuery || '(질문 없음)'}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-slate-400">실패한 SQL:</p>
                            <button
                              onClick={() => handleCopy(item.failedSql, `sql-${item.id}`)}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700/30 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 rounded transition-colors"
                              title="SQL 복사"
                            >
                              {copiedId === `sql-${item.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">복사됨</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>복사</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="bg-slate-900/80 rounded-lg p-3 overflow-x-auto">
                            <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                              <code dangerouslySetInnerHTML={{ __html: formatSql(item.failedSql) }} className="text-slate-300" />
                            </pre>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">오류 메시지:</p>
                          <p className="text-sm text-rose-400 bg-rose-500/10 rounded-lg p-3">{item.errorMessage}</p>
                        </div>
                      </div>

                      {/* 시도 이력 */}
                      {item.attempts.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 mb-2">보정 시도 이력 ({item.attempts.length}회):</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {item.attempts.map((attempt, idx) => (
                              <div key={idx} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-slate-400">시도 #{idx + 1}</span>
                                  <span className="text-xs text-slate-500">
                                    {new Date(attempt.timestamp).toLocaleString('ko-KR')}
                                  </span>
                                </div>
                                <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap break-words mb-2">
                                  {attempt.sql}
                                </pre>
                                <p className="text-xs text-rose-400/80">{attempt.error}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 해결된 경우 */}
                      {item.status === 'resolved' && item.resolvedSql && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                          <p className="text-xs text-emerald-400 mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            해결된 SQL
                          </p>
                          <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap break-words">
                            {item.resolvedSql}
                          </pre>
                        </div>
                      )}

                      {/* 해결 폼 */}
                      {isResolving && (
                        <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-4 space-y-3">
                          <p className="text-sm font-medium text-violet-300 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            수동 해결
                          </p>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">수정된 SQL:</label>
                            <textarea
                              value={resolveForm.sql}
                              onChange={(e) => setResolveForm({ ...resolveForm, sql: e.target.value })}
                              className="w-full bg-slate-900/80 border border-slate-600/30 rounded-lg p-3 text-sm font-mono text-white focus:outline-none focus:border-violet-500/50 resize-none"
                              rows={4}
                              placeholder="올바른 SQL 쿼리를 입력하세요..."
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">설명 (RAG 학습용):</label>
                            <input
                              type="text"
                              value={resolveForm.description}
                              onChange={(e) => setResolveForm({ ...resolveForm, description: e.target.value })}
                              className="w-full bg-slate-900/80 border border-slate-600/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                              placeholder="이 쿼리가 무엇을 하는지 설명하세요..."
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`embed-${item.id}`}
                              checked={resolveForm.embedToRag}
                              onChange={(e) => setResolveForm({ ...resolveForm, embedToRag: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-violet-500"
                            />
                            <label htmlFor={`embed-${item.id}`} className="text-sm text-slate-300">
                              RAG에 학습시키기
                            </label>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={submitResolve}
                              disabled={resolveMutation.isPending}
                              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                              {resolveMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              해결 완료
                            </button>
                            <button
                              onClick={() => {
                                setResolvingId(null);
                                setResolveForm({ sql: '', description: '', embedToRag: true });
                              }}
                              className="px-4 py-2 bg-slate-600/30 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 액션 버튼 */}
                      {item.status === 'pending' && !isResolving && (
                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                          <button
                            onClick={() => handleResolve(item)}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 rounded-lg transition-colors"
                          >
                            <Sparkles className="w-4 h-4" />
                            수동 해결
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('이 쿼리를 무시 처리하시겠습니까?')) {
                                ignoreMutation.mutate(item.id);
                              }
                            }}
                            disabled={ignoreMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Ban className="w-4 h-4" />
                            무시
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('이 쿼리를 삭제하시겠습니까?')) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 페이지네이션 */}
        {failedQueriesData && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              총 {failedQueriesData.total}개 중 {(currentPage - 1) * PAGE_SIZE + 1}-
              {Math.min(currentPage * PAGE_SIZE, failedQueriesData.total)}개
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
              <span className="px-4 py-2 text-sm text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
