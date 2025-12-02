import { useState } from 'react';
import {
  FileCode,
  Loader2,
  Trash2,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type FewShotExample, type EmbedExampleResponse, type ExampleItem } from '@/lib/api';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

export default function EmbeddingPage() {
  const queryClient = useQueryClient();

  // Few-shot 예제 입력 상태
  const [example, setExample] = useState<FewShotExample>({
    description: '',
    sql: '',
  });
  const [exampleResult, setExampleResult] = useState<EmbedExampleResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FewShotExample>({ description: '', sql: '' });

  // 예제 목록 조회 Query (페이징)
  const {
    data: examplesData,
    isLoading: isLoadingExamples,
    refetch: refetchExamples,
  } = useQuery({
    queryKey: ['examples', currentPage],
    queryFn: () => api.getExamples(currentPage, PAGE_SIZE),
  });

  // Few-shot 예제 임베딩 Mutation
  const exampleMutation = useMutation({
    mutationFn: (example: FewShotExample) => api.embedExample(example),
    onSuccess: (data) => {
      setExampleResult(data);
      setExample({ description: '', sql: '' });
      setCurrentPage(1); // 새 예제 추가 시 첫 페이지로 이동
      queryClient.invalidateQueries({ queryKey: ['examples'] });
      alert('학습 예시가 성공적으로 등록되었습니다.');
    },
    onError: (error) => {
      console.error('Example embedding error:', error);
      alert('학습 예시 등록 중 오류가 발생했습니다.');
    },
  });

  // 특정 예제 삭제 Mutation
  const deleteExampleMutation = useMutation({
    mutationFn: (id: string) => api.deleteExample(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examples'] });
      // 현재 페이지에 예제가 없으면 이전 페이지로
      if (examplesData?.examples.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    },
    onError: (error) => {
      console.error('Delete example error:', error);
      alert('학습 예시 삭제 중 오류가 발생했습니다.');
    },
  });

  // 전체 예제 삭제 Mutation
  const deleteAllMutation = useMutation({
    mutationFn: () => api.deleteAllExamples(),
    onSuccess: (data) => {
      setCurrentPage(1); // 전체 삭제 시 첫 페이지로
      queryClient.invalidateQueries({ queryKey: ['examples'] });
      alert(data.message);
    },
    onError: (error) => {
      console.error('Delete all error:', error);
      alert('전체 학습 예시 삭제 중 오류가 발생했습니다.');
    },
  });

  // 예제 수정 Mutation
  const updateExampleMutation = useMutation({
    mutationFn: ({ id, example }: { id: string; example: FewShotExample }) =>
      api.updateExample(id, example),
    onSuccess: (data) => {
      setEditingId(null);
      setEditForm({ description: '', sql: '' });
      queryClient.invalidateQueries({ queryKey: ['examples'] });
      alert(
        data.reembedded
          ? `학습 예시가 수정되었습니다. (재학습됨, ${data.processingTime}ms)`
          : `학습 예시가 수정되었습니다. (${data.processingTime}ms)`,
      );
    },
    onError: (error) => {
      console.error('Update example error:', error);
      alert('학습 예시 수정 중 오류가 발생했습니다.');
    },
  });

  const handleExampleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (example.description.trim() && example.sql.trim()) {
      exampleMutation.mutate(example);
    }
  };

  const handleDeleteExample = (id: string, description: string) => {
    const confirmed = window.confirm(`다음 학습 예시를 삭제하시겠습니까?\n\n"${description.substring(0, 50)}..."`);
    if (confirmed) {
      deleteExampleMutation.mutate(id);
    }
  };

  const handleDeleteAll = () => {
    const confirmed = window.confirm(
      '정말로 모든 학습 예시를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 모든 학습 예시가 영구적으로 삭제됩니다.',
    );
    if (confirmed) {
      deleteAllMutation.mutate();
    }
  };

  const handleExampleClear = () => {
    setExample({ description: '', sql: '' });
    setExampleResult(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleStartEdit = (item: ExampleItem) => {
    setEditingId(item.id);
    setEditForm({ description: item.description, sql: item.sql });
    setExpandedId(item.id); // 수정 시 자동으로 펼치기
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ description: '', sql: '' });
  };

  const handleSaveEdit = (id: string) => {
    if (editForm.description.trim() && editForm.sql.trim()) {
      updateExampleMutation.mutate({ id, example: editForm });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isLoading =
    exampleMutation.isPending ||
    deleteExampleMutation.isPending ||
    deleteAllMutation.isPending ||
    updateExampleMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass p-8 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-3">
              <div className="bg-gradient-to-br from-cyan-600 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-cyan-500/20">
                <FileCode className="w-5 h-5 text-white" />
              </div>
              AI 학습 관리
            </h2>
            <p className="text-slate-400 leading-relaxed">
              AI가 질문에 더 정확하게 답변할 수 있도록 학습 예시를 등록합니다. 유사한 질문이 들어오면
              등록된 예시를 참고하여 더 나은 결과를 제공합니다.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => refetchExamples()}
              disabled={isLoadingExamples}
              className={cn(
                'px-4 py-3 bg-white/5 text-slate-300 border border-white/10 rounded-xl font-medium',
                'hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <RefreshCw className={cn('w-5 h-5', isLoadingExamples && 'animate-spin')} />
            </button>
            <button
              onClick={handleDeleteAll}
              disabled={isLoading || !examplesData?.examples?.length}
              className={cn(
                'px-5 py-3 bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl font-medium',
                'hover:bg-red-600/30 hover:border-red-500/50 transition-all flex items-center gap-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {deleteAllMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  삭제 중...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  전체 삭제
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 예제 추가 토글 버튼 */}
      <button
        onClick={() => setShowForm(!showForm)}
        className={cn(
          'w-full px-6 py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
          showForm
            ? 'bg-slate-700/50 text-slate-300 border border-white/10'
            : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/30',
        )}
      >
        <Plus className={cn('w-5 h-5 transition-transform', showForm && 'rotate-45')} />
        {showForm ? '입력 폼 닫기' : '새 학습 예시 추가'}
      </button>

      {/* 예제 입력 폼 */}
      {showForm && (
        <form onSubmit={handleExampleSubmit} className="glass rounded-2xl shadow-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">설명 (Description)</label>
            <textarea
              value={example.description}
              onChange={(e) => setExample({ ...example, description: e.target.value })}
              placeholder="예: 최근 30일간 판매량 기준 상위 10개 상품을 조회하는 쿼리입니다. order_item과 product 테이블을 조인하여 상품별 총 판매량을 계산합니다."
              rows={3}
              className="w-full px-5 py-3.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white placeholder:text-slate-500 resize-none"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">SQL 쿼리</label>
            <textarea
              value={example.sql}
              onChange={(e) => setExample({ ...example, sql: e.target.value })}
              placeholder="SELECT p.product_name, SUM(oi.quantity) as total_sold&#10;FROM order_item oi&#10;JOIN product p ON oi.product_id = p.id&#10;WHERE oi.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)&#10;GROUP BY p.id&#10;ORDER BY total_sold DESC&#10;LIMIT 10"
              rows={6}
              className="w-full px-5 py-3.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white placeholder:text-slate-500 resize-none font-mono text-sm"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={
                isLoading ||
                !example.description.trim() ||
                !example.sql.trim()
              }
              className={cn(
                'px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium',
                'hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center gap-2',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
              )}
            >
              {exampleMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  등록 중...
                </>
              ) : (
                <>
                  <FileCode className="w-5 h-5" />
                  학습 등록
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleExampleClear}
              disabled={isLoading}
              className={cn(
                'px-6 py-3 bg-slate-700 text-white rounded-xl font-medium',
                'hover:bg-slate-600 transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              초기화
            </button>
          </div>
        </form>
      )}

      {/* 임베딩 완료 결과 */}
      {exampleResult && (
        <div className="glass rounded-2xl p-6 space-y-4 shadow-lg border border-green-500/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">등록 완료</h3>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium border border-green-500/20">
              {exampleResult.processingTime}ms
            </span>
          </div>
          <p className="text-slate-400 text-sm">ID: {exampleResult.id}</p>
        </div>
      )}

      {/* 예제 목록 */}
      <div className="glass rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">등록된 학습 예시</h3>
          <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium border border-cyan-500/20">
            {examplesData?.total || 0}개
          </span>
        </div>

        {isLoadingExamples ? (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mx-auto mb-3" />
            <p className="text-slate-400">학습 예시를 불러오는 중...</p>
          </div>
        ) : !examplesData?.examples?.length ? (
          <div className="text-center py-12 text-slate-400">
            <FileCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>등록된 학습 예시가 없습니다.</p>
            <p className="text-sm mt-1">위의 '새 학습 예시 추가' 버튼을 눌러 등록해보세요.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {examplesData.examples.map((item: ExampleItem) => (
                <div
                  key={item.id}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-all"
                    onClick={() => toggleExpand(item.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{item.description}</p>
                      <p className="text-slate-500 text-sm">{formatDate(item.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(item);
                        }}
                        disabled={isLoading}
                        className={cn(
                          'p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-all',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                        title="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExample(item.id, item.description);
                        }}
                        disabled={deleteExampleMutation.isPending}
                        className={cn(
                          'p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedId === item.id ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {expandedId === item.id && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                      {editingId === item.id ? (
                        // 수정 모드
                        <>
                          <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">
                              설명
                            </label>
                            <textarea
                              value={editForm.description}
                              onChange={(e) =>
                                setEditForm({ ...editForm, description: e.target.value })
                              }
                              rows={3}
                              className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white text-sm placeholder:text-slate-500 resize-none"
                              disabled={updateExampleMutation.isPending}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">
                              SQL
                            </label>
                            <textarea
                              value={editForm.sql}
                              onChange={(e) => setEditForm({ ...editForm, sql: e.target.value })}
                              rows={6}
                              className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-white font-mono text-sm placeholder:text-slate-500 resize-none"
                              disabled={updateExampleMutation.isPending}
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              disabled={
                                updateExampleMutation.isPending ||
                                !editForm.description.trim() ||
                                !editForm.sql.trim()
                              }
                              className={cn(
                                'px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium text-sm',
                                'hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center gap-2',
                                'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                              )}
                            >
                              {updateExampleMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  저장 중...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4" />
                                  저장
                                </>
                              )}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={updateExampleMutation.isPending}
                              className={cn(
                                'px-4 py-2 bg-slate-700 text-white rounded-lg font-medium text-sm',
                                'hover:bg-slate-600 transition-all flex items-center gap-2',
                                'disabled:opacity-50 disabled:cursor-not-allowed',
                              )}
                            >
                              <X className="w-4 h-4" />
                              취소
                            </button>
                          </div>
                        </>
                      ) : (
                        // 보기 모드
                        <>
                          <div>
                            <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                              설명
                            </h4>
                            <p className="text-slate-300 text-sm bg-slate-900/50 p-3 rounded-lg whitespace-pre-wrap">
                              {item.description}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                              SQL
                            </h4>
                            <pre className="text-slate-300 font-mono text-sm bg-slate-900/50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                              {item.sql}
                            </pre>
                          </div>
                          {item.updatedAt && (
                            <p className="text-xs text-slate-500">
                              수정됨: {formatDate(item.updatedAt)}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            {examplesData.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || isLoadingExamples}
                  className={cn(
                    'p-2 rounded-lg transition-all',
                    'bg-white/5 text-slate-300 border border-white/10',
                    'hover:bg-white/10 hover:border-white/20',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: examplesData.totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // 현재 페이지 주변 2개씩, 처음과 끝 페이지 표시
                      return (
                        page === 1 ||
                        page === examplesData.totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, index, array) => {
                      // 생략 부분에 ... 표시
                      const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsisBefore && (
                            <span className="px-2 text-slate-500">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            disabled={isLoadingExamples}
                            className={cn(
                              'min-w-[36px] h-9 px-3 rounded-lg font-medium transition-all',
                              page === currentPage
                                ? 'bg-cyan-600 text-white'
                                : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10',
                              'disabled:opacity-50',
                            )}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    })}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(examplesData.totalPages, prev + 1))}
                  disabled={currentPage === examplesData.totalPages || isLoadingExamples}
                  className={cn(
                    'p-2 rounded-lg transition-all',
                    'bg-white/5 text-slate-300 border border-white/10',
                    'hover:bg-white/10 hover:border-white/20',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <span className="ml-4 text-sm text-slate-500">
                  {currentPage} / {examplesData.totalPages} 페이지
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
