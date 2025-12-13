import {
  AlertCircle,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Copy,
  Database,
  Loader2,
  Rows3,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/components/common/Toast';
import { api, type QueryHistoryItem, type QueryLearningResponse } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  queries: QueryHistoryItem[];
  /** 사용자 질문 (실패 쿼리 학습에 사용) */
  userQuestion?: string;
}

export default function SqlQueryHistory({ queries, userQuestion }: Props) {
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [learningId, setLearningId] = useState<string | null>(null);
  const [checkingDuplicateId, setCheckingDuplicateId] = useState<string | null>(null);
  const [learnedQueryIds, setLearnedQueryIds] = useState<Set<string>>(new Set());
  const [learningResult, setLearningResult] = useState<{
    id: string;
    result: QueryLearningResponse;
  } | null>(null);

  if (queries.length === 0) {
    return null;
  }

  const handleCopy = async (query: string, id: string) => {
    try {
      await navigator.clipboard.writeText(query);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleLearnFailedQuery = async (item: QueryHistoryItem) => {
    if (!userQuestion) {
      showToast('error', '사용자 질문이 필요합니다.');
      return;
    }

    // 1. 중복 검증 단계
    setCheckingDuplicateId(item.id);
    try {
      const duplicateCheck = await api.checkDuplicateEmbedding(item.query);

      if (duplicateCheck.exists) {
        showToast(
          'warning',
          `이미 유사한 쿼리가 임베딩되어 있습니다. (유사도: ${((duplicateCheck.similarQueries?.[0]?.score || 0) * 100).toFixed(1)}%)`,
          5000,
        );
        setCheckingDuplicateId(null);
        return;
      }
    } catch (err) {
      console.warn('Duplicate check failed, proceeding with learning:', err);
      // 중복 검증 실패해도 학습은 진행
    }
    setCheckingDuplicateId(null);

    // 2. 학습 진행
    setLearningId(item.id);
    setLearningResult(null);

    try {
      const response = await api.learnFailedQuery({
        originalQuery: userQuestion,
        failedSql: item.query,
        errorMessage: item.error || 'Unknown error',
        userQuestion: userQuestion,
      });

      setLearningResult({ id: item.id, result: response });

      // 학습 결과에 따른 토스트 메시지
      if (response.success) {
        showToast('success', response.message || '쿼리가 성공적으로 학습되었습니다!');
        // 학습 성공한 쿼리 ID 추가
        setLearnedQueryIds((prev) => new Set([...prev, item.id]));
      } else {
        showToast('warning', response.message || '자동 보정에 실패했습니다. 관리자 검토가 필요합니다.', 5000);
      }
    } catch (err) {
      console.error('Failed to learn query:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      showToast('error', `학습 요청 실패: ${errorMessage}`);
      setLearningResult({
        id: item.id,
        result: {
          success: false,
          message: `학습 요청 중 오류가 발생했습니다: ${errorMessage}`,
          attempts: 0,
        },
      });
    } finally {
      setLearningId(null);
    }
  };

  const formatSql = (sql: string) => {
    // 간단한 SQL 포매팅 (키워드 강조)
    const keywords = [
      'SELECT',
      'FROM',
      'WHERE',
      'JOIN',
      'LEFT JOIN',
      'RIGHT JOIN',
      'INNER JOIN',
      'ON',
      'AND',
      'OR',
      'ORDER BY',
      'GROUP BY',
      'HAVING',
      'LIMIT',
      'AS',
      'COUNT',
      'SUM',
      'AVG',
      'MAX',
      'MIN',
      'DISTINCT',
      'IN',
      'NOT',
      'NULL',
      'IS',
      'LIKE',
      'BETWEEN',
      'CASE',
      'WHEN',
      'THEN',
      'ELSE',
      'END',
    ];

    let formatted = sql;
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, `<span class="text-blue-400 font-semibold">${keyword}</span>`);
    });

    return formatted;
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gradient-to-r from-blue-600/20 to-cyan-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between hover:from-blue-600/30 hover:to-cyan-600/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/30 p-2 rounded-lg">
            <Database className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">SQL Query History</h3>
            <p className="text-sm text-slate-400">{queries.length}개 쿼리 실행</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {queries.map((item, index) => {
            const isQueryExpanded = expandedQuery === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  'glass rounded-xl overflow-hidden border transition-all',
                  item.success ? 'border-emerald-500/20' : 'border-rose-500/20',
                )}
              >
                {/* 쿼리 헤더 */}
                <button
                  onClick={() => setExpandedQuery(isQueryExpanded ? null : item.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        item.success ? 'bg-emerald-500/20' : 'bg-rose-500/20',
                      )}
                    >
                      {item.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Code2 className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-white">Query #{index + 1}</span>
                        {!item.success && item.error && (
                          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-xs rounded-full">실패</span>
                        )}
                        {item.fewShotExamples && item.fewShotExamples.length > 0 && (
                          <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            RAG 참조
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.executionTime}ms
                        </span>
                        <span className="flex items-center gap-1">
                          <Rows3 className="w-3 h-3" />
                          {item.rowCount}행
                        </span>
                      </div>
                      {/* 실패 시 에러 미리보기 (펼치지 않아도 보임) */}
                      {!item.success && item.error && !isQueryExpanded && (
                        <p className="text-xs text-rose-400/80 mt-1 truncate max-w-md">{item.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(item.query, item.id);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="쿼리 복사"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    {/* 실패 쿼리 학습 버튼 - 학습 성공 시 숨김 */}
                    {!item.success && userQuestion && !learnedQueryIds.has(item.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLearnFailedQuery(item);
                        }}
                        disabled={learningId === item.id || checkingDuplicateId === item.id}
                        className={cn(
                          'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium',
                          learningId === item.id || checkingDuplicateId === item.id
                            ? 'bg-violet-500/20 text-violet-400 cursor-wait'
                            : 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 hover:text-violet-300',
                        )}
                        title="AI가 쿼리를 분석하고 수정하여 학습합니다"
                      >
                        {checkingDuplicateId === item.id ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                            중복 검증 중...
                          </>
                        ) : learningId === item.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            학습 중...
                          </>
                        ) : (
                          <>
                            <Brain className="w-3.5 h-3.5" />
                            실패 쿼리 학습
                          </>
                        )}
                      </button>
                    )}
                    {/* 학습 완료 표시 */}
                    {learnedQueryIds.has(item.id) && (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        학습 완료
                      </span>
                    )}
                    {isQueryExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* 쿼리 본문 */}
                {isQueryExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* Few-shot 예제 표시 */}
                    {item.fewShotExamples && item.fewShotExamples.length > 0 && (
                      <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-4 h-4 text-violet-400" />
                          <span className="text-sm font-medium text-violet-300">RAG 참조 쿼리 예제</span>
                          <span className="text-xs text-violet-400/70 bg-violet-500/20 px-2 py-0.5 rounded-full">
                            {item.fewShotExamples.length}개
                          </span>
                        </div>
                        <div className="space-y-3">
                          {item.fewShotExamples.map((example, exIndex) => (
                            <div key={exIndex} className="bg-slate-900/60 rounded-lg p-3 border border-violet-500/10">
                              <div className="flex items-start gap-2 mb-2">
                                <BookOpen className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-slate-300">{example.description}</p>
                                  {example.score !== undefined && (
                                    <span className="text-xs text-violet-400/60 mt-1 block">
                                      유사도: {(example.score * 100).toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="bg-slate-950/50 rounded p-2 overflow-x-auto">
                                <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                                  <code
                                    dangerouslySetInnerHTML={{ __html: formatSql(example.sql) }}
                                    className="text-slate-400"
                                  />
                                </pre>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 실행된 SQL 쿼리 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-slate-300">실행된 쿼리</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md">
                            <Clock className="w-3 h-3" />
                            {item.executionTime}ms
                          </span>
                          <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md">
                            <Rows3 className="w-3 h-3" />
                            {item.rowCount}행 반환
                          </span>
                        </div>
                      </div>
                      <div className="bg-slate-900/80 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                          <code
                            dangerouslySetInnerHTML={{ __html: formatSql(item.query) }}
                            className="text-slate-300"
                          />
                        </pre>
                      </div>
                    </div>

                    {item.error && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <XCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-rose-400 mb-1">SQL 실행 오류</p>
                            <p className="text-sm text-rose-300/80 whitespace-pre-wrap break-words">{item.error}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 학습 결과 표시 */}
                    {learningResult && learningResult.id === item.id && (
                      <div
                        className={cn(
                          'p-4 rounded-lg border',
                          learningResult.result.success
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-amber-500/10 border-amber-500/20',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {learningResult.result.success ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Brain className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0 space-y-2">
                            <p
                              className={cn(
                                'text-sm font-medium',
                                learningResult.result.success ? 'text-emerald-400' : 'text-amber-400',
                              )}
                            >
                              {learningResult.result.success ? '✓ 쿼리 학습 완료' : '⚠ 자동 보정 실패'}
                            </p>
                            <p className="text-sm text-slate-300">{learningResult.result.message}</p>

                            {learningResult.result.embedded && (
                              <div className="flex items-center gap-2 text-xs text-emerald-400/80">
                                <Sparkles className="w-3 h-3" />
                                <span>RAG에 성공적으로 임베딩되었습니다</span>
                              </div>
                            )}

                            {learningResult.result.failedQueryId && (
                              <div className="flex items-center gap-2 text-xs text-amber-400/80">
                                <Database className="w-3 h-3" />
                                <span>실패 쿼리로 저장되었습니다 (시도: {learningResult.result.attempts}회)</span>
                              </div>
                            )}

                            {learningResult.result.correctedSql && (
                              <div className="mt-2">
                                <p className="text-xs text-slate-400 mb-1">보정된 쿼리:</p>
                                <div className="bg-slate-900/80 rounded p-2 overflow-x-auto">
                                  <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                                    <code
                                      dangerouslySetInnerHTML={{
                                        __html: formatSql(learningResult.result.correctedSql),
                                      }}
                                      className="text-slate-300"
                                    />
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
