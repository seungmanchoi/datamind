import { useState } from 'react';
import {
  Search,
  Loader2,
  Bot,
  BarChart3,
  LineChart,
  PieChart,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  X,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api, type AgentQueryResponse } from '@/lib/api';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import ResultChart from '@/components/ResultChart';

export default function QueryPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AgentQueryResponse | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [showClarifyingModal, setShowClarifyingModal] = useState(false);
  const [clarifyingAnswers, setClarifyingAnswers] = useState<Record<number, string>>({});

  const queryMutation = useMutation({
    mutationFn: (queryText: string) => api.queryAgent(queryText),
    onSuccess: (data) => {
      setResult(data);

      // Phase 7: 추가 질문이 있으면 모달 표시
      if (data.clarifyingQuestions) {
        setShowClarifyingModal(true);
        // 기본값 설정
        const defaultAnswers: Record<number, string> = {};
        data.clarifyingQuestions.questions.forEach((q, index) => {
          defaultAnswers[index] = q.default;
        });
        setClarifyingAnswers(defaultAnswers);
      } else {
        // Phase 7: AI 추천 차트 타입 자동 설정
        if (data.visualization?.chartType) {
          setChartType(data.visualization.chartType);
        }
      }

      // 히스토리에 저장 (LocalStorage)
      const history = JSON.parse(localStorage.getItem('query_history') || '[]');
      history.unshift({
        query: data.query,
        result: data,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('query_history', JSON.stringify(history.slice(0, 50)));
    },
    onError: (error) => {
      console.error('Query error:', error);
      alert('질의 실행 중 오류가 발생했습니다.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      queryMutation.mutate(query.trim());
    }
  };

  // 추가 질문에 답변하고 다시 질의
  const handleClarifyingSubmit = () => {
    if (result?.clarifyingQuestions) {
      // 질문과 답변을 합쳐서 새로운 질의 생성
      const questions = result.clarifyingQuestions.questions;
      const clarifiedQuery = `${result.query} (${questions
        .map((q, idx) => `${q.question}: ${clarifyingAnswers[idx]}`)
        .join(', ')})`;

      setShowClarifyingModal(false);
      queryMutation.mutate(clarifiedQuery);
    }
  };

  // 프리셋 예제 쿼리
  const exampleQueries = [
    '최근 30일간 가장 많이 팔린 상품 10개는?',
    '소나타 매장의 이번 달 매출은 얼마인가요?',
    '카테고리별 평균 판매가는?',
    '1개만 구매 가능한 상품 추천',
  ];

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border border-gray-200/50 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl">
            <Bot className="w-5 h-5 text-white" />
          </div>
          AI 자연어 질의
        </h2>
        <p className="text-gray-600 leading-relaxed">
          자연어로 데이터를 질의하면 AI가 자동으로 시각화 방법을 결정하고 풍부한 인사이트를 제공합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-6 space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 최근 30일간 가장 많이 팔린 상품은?"
            className="flex-1 px-5 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all bg-white/80"
            disabled={queryMutation.isPending}
          />
          <button
            type="submit"
            disabled={queryMutation.isPending || !query.trim()}
            className={cn(
              'px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium',
              'hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
            )}
          >
            {queryMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                분석 중
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                질의 실행
              </>
            )}
          </button>
        </div>

        {/* 프리셋 예제 버튼 */}
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="text-sm text-gray-500 self-center mr-1 font-medium">빠른 질의:</span>
          {exampleQueries.map((example, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleExampleClick(example)}
              className="px-4 py-2 text-sm bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100
                       text-gray-700 hover:text-gray-900 rounded-lg border border-gray-200/50
                       transition-all duration-200 hover:shadow-sm"
              disabled={queryMutation.isPending}
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {queryMutation.isPending && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-8 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-blue-700 font-medium text-lg">AI가 분석 중입니다...</p>
        </div>
      )}

      {/* Phase 7: 추가 질문 모달 */}
      {showClarifyingModal && result?.clarifyingQuestions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                질문을 좀 더 구체화해주세요
              </h3>
              <button
                onClick={() => setShowClarifyingModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200/50">
                {result.clarifyingQuestions.reason}
              </p>

              {result.clarifyingQuestions.questions.map((question, index) => (
                <div key={index} className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {question.question}
                  </label>
                  <select
                    value={clarifyingAnswers[index] || question.default}
                    onChange={(e) =>
                      setClarifyingAnswers({ ...clarifyingAnswers, [index]: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all bg-white"
                  >
                    {question.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200/50 flex justify-end gap-3">
              <button
                onClick={() => setShowClarifyingModal(false)}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleClarifyingSubmit}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                다시 질의하기
              </button>
            </div>
          </div>
        </div>
      )}

      {result && !result.clarifyingQuestions && (
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-8 space-y-6 shadow-sm">
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3">질의</h3>
            <p className="text-gray-700 bg-gradient-to-r from-gray-50 to-blue-50/30 p-4 rounded-xl border border-gray-200/50">{result.query}</p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3">생성된 SQL</h3>
            <pre className="bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 p-5 rounded-xl overflow-x-auto border border-gray-700">
              <code>{result.sql}</code>
            </pre>
          </div>

          {/* Phase 7: 화려한 인사이트 표시 */}
          {result.insights && (
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-8 rounded-2xl border border-violet-200/50 space-y-5 shadow-sm">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-gradient-to-br from-violet-600 to-purple-600 p-2.5 rounded-xl">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                AI 인사이트
              </h3>

              {/* 요약 */}
              <div className="bg-white/90 backdrop-blur-sm p-5 rounded-xl border border-violet-200/50">
                <p className="text-gray-800 text-lg leading-relaxed">{result.insights.summary}</p>
              </div>

              {/* 핵심 발견사항 */}
              {result.insights.keyFindings.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                    핵심 발견사항
                  </h4>
                  <ul className="space-y-2.5">
                    {result.insights.keyFindings.map((finding, idx) => (
                      <li
                        key={idx}
                        className="bg-white/90 backdrop-blur-sm p-4 rounded-xl text-gray-800 flex items-start gap-3 border border-violet-200/30 hover:border-violet-300/50 transition-colors"
                      >
                        <span className="text-2xl">{finding.split(' ')[0]}</span>
                        <span className="leading-relaxed">{finding.substring(finding.indexOf(' ') + 1)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 비교 분석 */}
              {result.insights.comparison && (
                <div className="bg-white/90 backdrop-blur-sm p-5 rounded-xl border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="bg-blue-100 p-1.5 rounded-lg">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                    </div>
                    비교 분석
                  </h4>
                  <p className="text-gray-700 leading-relaxed">{result.insights.comparison}</p>
                </div>
              )}

              {/* 트렌드 */}
              {result.insights.trend && (
                <div className="bg-white/90 backdrop-blur-sm p-5 rounded-xl border-l-4 border-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="bg-emerald-100 p-1.5 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    트렌드
                  </h4>
                  <p className="text-gray-700 leading-relaxed">{result.insights.trend}</p>
                </div>
              )}

              {/* 이상치/특이사항 */}
              {result.insights.anomaly && (
                <div className="bg-white/90 backdrop-blur-sm p-5 rounded-xl border-l-4 border-amber-500 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="bg-amber-100 p-1.5 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    </div>
                    특이사항
                  </h4>
                  <p className="text-gray-700 leading-relaxed">{result.insights.anomaly}</p>
                </div>
              )}

              {/* 추천 사항 */}
              {result.insights.recommendation && (
                <div className="bg-white/90 backdrop-blur-sm p-5 rounded-xl border-l-4 border-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="bg-indigo-100 p-1.5 rounded-lg">
                      <Lightbulb className="w-4 h-4 text-indigo-600" />
                    </div>
                    추천 사항
                  </h4>
                  <p className="text-gray-700 leading-relaxed">{result.insights.recommendation}</p>
                </div>
              )}
            </div>
          )}

          {/* Phase 7: AI 추천 시각화 표시 */}
          {result.results && result.results.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    결과 ({result.results.length}건)
                  </h3>
                  {result.visualization && (
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      AI 추천: {result.visualization.reason}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartType('bar')}
                    className={cn(
                      'px-4 py-2 text-sm rounded-xl transition-all flex items-center gap-2 font-medium',
                      chartType === 'bar'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Bar
                  </button>
                  <button
                    onClick={() => setChartType('line')}
                    className={cn(
                      'px-4 py-2 text-sm rounded-xl transition-all flex items-center gap-2 font-medium',
                      chartType === 'line'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    <LineChart className="w-4 h-4" />
                    Line
                  </button>
                  <button
                    onClick={() => setChartType('pie')}
                    className={cn(
                      'px-4 py-2 text-sm rounded-xl transition-all flex items-center gap-2 font-medium',
                      chartType === 'pie'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    <PieChart className="w-4 h-4" />
                    Pie
                  </button>
                </div>
              </div>

              {/* 차트/테이블 표시 */}
              {(result.visualization?.type === 'chart' || result.visualization?.type === 'both') && (
                <div className="mb-4">
                  <ResultChart data={result.results} type={chartType} />
                </div>
              )}

              {(result.visualization?.type === 'table' ||
                result.visualization?.type === 'both' ||
                !result.visualization) && (
                <div className="overflow-x-auto rounded-xl border border-gray-200/50">
                  <table className="min-w-full divide-y divide-gray-200/50">
                    <thead className="bg-gradient-to-r from-gray-50 to-blue-50/30">
                      <tr>
                        {Object.keys(result.results[0]).map((key) => (
                          <th
                            key={key}
                            className="px-5 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white/80 divide-y divide-gray-200/30">
                      {result.results.map((row, idx) => {
                        return (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            {Object.entries(row).map(([key, value], cellIdx) => {
                              // 금액 필드인지 확인
                              const isCurrency =
                                /price|amount|금액|매출|판매|수익|revenue|sales|total|합계|평균/i.test(
                                  key,
                                );

                              // 숫자 필드인지 확인
                              const isNumeric =
                                value !== null &&
                                value !== '' &&
                                !isNaN(Number(value));

                              let displayValue: string;
                              if (isCurrency && isNumeric) {
                                displayValue = formatCurrency(value);
                              } else if (
                                isNumeric &&
                                /수량|count|개수|건수/i.test(key)
                              ) {
                                displayValue = formatNumber(value);
                              } else {
                                displayValue = String(value ?? '');
                              }

                              return (
                                <td
                                  key={cellIdx}
                                  className={cn(
                                    'px-5 py-4 text-sm text-gray-700 font-medium',
                                    isNumeric ? 'text-right whitespace-nowrap' : 'whitespace-nowrap',
                                  )}
                                >
                                  {displayValue}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="text-sm text-gray-500 pt-2 border-t">
            실행 시간: {result.executionTime}ms
          </div>
        </div>
      )}
    </div>
  );
}
