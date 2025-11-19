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
    '강남역점의 이번 달 매출은 얼마인가요?',
    '카테고리별 평균 판매가는?',
    '재고가 10개 미만인 상품 목록',
  ];

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-2">
          <Bot className="w-6 h-6 text-blue-600" />
          AI 자연어 질의 (Phase 7 Enhanced)
        </h2>
        <p className="text-gray-600">
          자연어로 데이터를 질의하면 AI가 자동으로 시각화 방법을 결정하고 풍부한 인사이트를
          제공합니다. ✨
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 최근 30일간 가장 많이 팔린 상품은? (기간/개수 등을 생략하면 AI가 추가 질문을 합니다)"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={queryMutation.isPending}
          />
          <button
            type="submit"
            disabled={queryMutation.isPending || !query.trim()}
            className={cn(
              'px-6 py-3 bg-blue-600 text-white rounded-lg font-medium',
              'hover:bg-blue-700 transition-colors flex items-center gap-2',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {queryMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                분석 중...
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
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 self-center mr-2">예제 질의:</span>
          {exampleQueries.map((example, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleExampleClick(example)}
              className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700
                       hover:text-blue-800 rounded-md border border-blue-200
                       transition-colors duration-200"
              disabled={queryMutation.isPending}
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {queryMutation.isPending && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-blue-700 font-medium">AI가 분석 중입니다...</p>
        </div>
      )}

      {/* Phase 7: 추가 질문 모달 */}
      {showClarifyingModal && result?.clarifyingQuestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                질문을 좀 더 구체화해주세요
              </h3>
              <button
                onClick={() => setShowClarifyingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-gray-600 bg-blue-50 p-3 rounded border border-blue-100">
                {result.clarifyingQuestions.reason}
              </p>

              {result.clarifyingQuestions.questions.map((question, index) => (
                <div key={index} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {question.question}
                  </label>
                  <select
                    value={clarifyingAnswers[index] || question.default}
                    onChange={(e) =>
                      setClarifyingAnswers({ ...clarifyingAnswers, [index]: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowClarifyingModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleClarifyingSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                다시 질의하기
              </button>
            </div>
          </div>
        </div>
      )}

      {result && !result.clarifyingQuestions && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">질의</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded">{result.query}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">생성된 SQL</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
              <code>{result.sql}</code>
            </pre>
          </div>

          {/* Phase 7: 화려한 인사이트 표시 */}
          {result.insights && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200 space-y-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                AI 인사이트
              </h3>

              {/* 요약 */}
              <div className="bg-white bg-opacity-80 p-4 rounded-lg">
                <p className="text-gray-800 text-lg leading-relaxed">{result.insights.summary}</p>
              </div>

              {/* 핵심 발견사항 */}
              {result.insights.keyFindings.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                    핵심 발견사항
                  </h4>
                  <ul className="space-y-2">
                    {result.insights.keyFindings.map((finding, idx) => (
                      <li
                        key={idx}
                        className="bg-white bg-opacity-80 p-3 rounded-lg text-gray-800 flex items-start gap-2"
                      >
                        <span className="text-xl mt-0.5">{finding.split(' ')[0]}</span>
                        <span>{finding.substring(finding.indexOf(' ') + 1)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 비교 분석 */}
              {result.insights.comparison && (
                <div className="bg-blue-50 bg-opacity-80 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    비교 분석
                  </h4>
                  <p className="text-blue-900">{result.insights.comparison}</p>
                </div>
              )}

              {/* 트렌드 */}
              {result.insights.trend && (
                <div className="bg-green-50 bg-opacity-80 p-4 rounded-lg border border-green-200">
                  <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    트렌드
                  </h4>
                  <p className="text-green-900">{result.insights.trend}</p>
                </div>
              )}

              {/* 이상치/특이사항 */}
              {result.insights.anomaly && (
                <div className="bg-yellow-50 bg-opacity-80 p-4 rounded-lg border border-yellow-300">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    특이사항
                  </h4>
                  <p className="text-yellow-900">{result.insights.anomaly}</p>
                </div>
              )}

              {/* 추천 사항 */}
              {result.insights.recommendation && (
                <div className="bg-indigo-50 bg-opacity-80 p-4 rounded-lg border border-indigo-200">
                  <h4 className="text-sm font-semibold text-indigo-800 mb-2 flex items-center gap-1">
                    <Lightbulb className="w-4 h-4" />
                    추천 사항
                  </h4>
                  <p className="text-indigo-900">{result.insights.recommendation}</p>
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
                      'px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-1',
                      chartType === 'bar'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Bar
                  </button>
                  <button
                    onClick={() => setChartType('line')}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-1',
                      chartType === 'line'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    <LineChart className="w-4 h-4" />
                    Line
                  </button>
                  <button
                    onClick={() => setChartType('pie')}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded transition-colors flex items-center gap-1',
                      chartType === 'pie'
                        ? 'bg-blue-600 text-white'
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
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(result.results[0]).map((key) => (
                          <th
                            key={key}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.results.map((row, idx) => {
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
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
                                    'px-4 py-3 text-sm text-gray-700',
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
