import { useMutation } from '@tanstack/react-query';
import { Loader2, Search, Sparkles, Users } from 'lucide-react';
import { useCallback, useState } from 'react';

import { ClarificationModal, ResponseContainer } from '@/components/multi-agent';
import FollowUpPanel, { type ExtendedFollowUpQuestion } from '@/components/multi-agent/followup/FollowUpPanel';
import { type ClarificationSection, type FollowUpQuestion, type MultiAgentResponse, api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function MultiAgentPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<MultiAgentResponse | null>(null);
  const [isFollowUp, setIsFollowUp] = useState(false);

  // 명확화 모달 상태
  const [showClarificationModal, setShowClarificationModal] = useState(false);
  const [clarification, setClarification] = useState<ClarificationSection | null>(null);
  const [originalQuery, setOriginalQuery] = useState('');

  // 후속 질문 히스토리 관리
  const [followUpHistory, setFollowUpHistory] = useState<ExtendedFollowUpQuestion[]>([]);

  const queryMutation = useMutation({
    mutationFn: ({ queryText, skipClarification }: { queryText: string; skipClarification: boolean }) =>
      api.queryMultiAgent(queryText, skipClarification),
    onSuccess: (data) => {
      // 명확화가 필요한 경우
      if (data.clarification?.needsClarification) {
        setClarification(data.clarification);
        setOriginalQuery(data.meta.query);
        setShowClarificationModal(true);
        return;
      }

      setResult(data);
      setShowClarificationModal(false);
      setClarification(null);

      // 새로운 후속 질문을 히스토리에 추가 (중복 제거)
      if (data.followUp?.questions && data.followUp.questions.length > 0) {
        const newQuestions: ExtendedFollowUpQuestion[] = data.followUp.questions.map((q) => ({
          ...q,
          source: 'ai' as const,
          timestamp: Date.now(),
        }));

        setFollowUpHistory((prev) => {
          const combined = [...prev];
          newQuestions.forEach((newQ) => {
            if (!combined.find((existing) => existing.text === newQ.text)) {
              combined.push(newQ);
            }
          });
          return combined;
        });
      }

      // 히스토리에 저장 (LocalStorage)
      const history = JSON.parse(localStorage.getItem('multi_agent_history') || '[]');
      history.unshift({
        query: data.meta.query,
        result: data,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('multi_agent_history', JSON.stringify(history.slice(0, 50)));
    },
    onError: (error) => {
      console.error('Multi-Agent query error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // 새 질문이므로 후속 질문 히스토리 초기화
      setFollowUpHistory([]);
      setIsFollowUp(false);
      queryMutation.mutate({ queryText: query.trim(), skipClarification: false });
    }
  };

  // 명확화된 질의로 다시 요청
  const handleClarificationSubmit = useCallback(
    (clarifiedQuery: string) => {
      setQuery(clarifiedQuery);
      setShowClarificationModal(false);
      // 명확화 단계 건너뛰고 바로 실행
      queryMutation.mutate({ queryText: clarifiedQuery, skipClarification: true });
    },
    [queryMutation],
  );

  // 명확화 취소
  const handleClarificationCancel = useCallback(() => {
    setShowClarificationModal(false);
    setClarification(null);
  }, []);

  const handleFollowUpClick = useCallback(
    (followUpQuery: string) => {
      setQuery(followUpQuery);
      setIsFollowUp(true);
      queryMutation.mutate({ queryText: followUpQuery, skipClarification: false });
    },
    [queryMutation],
  );

  const handleAddFollowUp = useCallback((question: ExtendedFollowUpQuestion) => {
    setFollowUpHistory((prev) => {
      if (prev.find((q) => q.text === question.text)) {
        return prev;
      }
      return [...prev, question];
    });
  }, []);

  const handleRemoveFollowUp = useCallback((id: string) => {
    setFollowUpHistory((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const handleRetry = () => {
    if (result?.meta.query) {
      queryMutation.mutate({ queryText: result.meta.query, skipClarification: true });
    }
  };

  // 프리셋 예제 쿼리
  const exampleQueries = [
    '이번 달 매출 상위 10개 상품과 트렌드 분석',
    '카테고리별 매출 비중과 개선 기회',
    '매장별 성과 비교 및 인사이트',
    '최근 주문 패턴 분석과 추천',
  ];

  // 현재 응답의 후속 질문
  const currentFollowUpQuestions: FollowUpQuestion[] = result?.followUp?.questions || [];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="glass p-8 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-3">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-violet-500/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          Multi-Agent 분석
        </h2>
        <p className="text-slate-400 leading-relaxed">
          5개의 전문 AI 에이전트가 협력하여 종합적인 데이터 분석과 인사이트를 제공합니다.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {['SQL 전문가', '검색 전문가', '인사이트 분석가', '차트 어드바이저', '후속 질문 생성'].map((agent) => (
            <span key={agent} className="px-3 py-1 bg-violet-500/20 text-violet-300 rounded-full text-sm">
              {agent}
            </span>
          ))}
        </div>
      </div>

      {/* 입력 폼 */}
      <form onSubmit={handleSubmit} className="glass rounded-2xl shadow-lg p-6 space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 이번 달 매출 상위 상품과 성장 트렌드를 분석해주세요"
            className="flex-1 px-5 py-3.5 bg-slate-900/50 border border-white/10 rounded-xl
                     focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500
                     transition-all text-white placeholder:text-slate-500"
            disabled={queryMutation.isPending}
          />
          <button
            type="submit"
            disabled={queryMutation.isPending || !query.trim()}
            className={cn(
              'px-6 py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium',
              'hover:shadow-lg hover:shadow-violet-500/30 transition-all flex items-center gap-2',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
            )}
          >
            {queryMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                분석 중
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                분석 실행
              </>
            )}
          </button>
        </div>

        {/* 프리셋 예제 버튼 */}
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="text-sm text-slate-500 self-center mr-1 font-medium">예제 질의:</span>
          {exampleQueries.map((example, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setQuery(example)}
              className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10
                       text-slate-300 hover:text-white rounded-lg border border-white/5
                       transition-all duration-200 hover:shadow-sm hover:border-white/20"
              disabled={queryMutation.isPending}
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {/* 후속 질문 패널 (결과가 있거나 히스토리가 있을 때 표시) */}
      {(result || followUpHistory.length > 0) && !queryMutation.isPending && (
        <FollowUpPanel
          currentQuestions={currentFollowUpQuestions}
          historyQuestions={followUpHistory.filter((h) => !currentFollowUpQuestions.find((c) => c.text === h.text))}
          onQuestionClick={handleFollowUpClick}
          onAddQuestion={handleAddFollowUp}
          onRemoveQuestion={handleRemoveFollowUp}
        />
      )}

      {/* 로딩 상태 */}
      {queryMutation.isPending && (
        <div className="glass border border-violet-500/20 rounded-2xl p-8 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto mb-3" />
          <p className="text-violet-400 font-medium text-lg">Multi-Agent가 분석 중입니다...</p>
          <p className="text-slate-500 text-sm mt-2">
            {isFollowUp
              ? '후속 질문에 대한 심층 분석을 진행하고 있습니다'
              : '여러 에이전트가 협력하여 종합적인 인사이트를 도출하고 있습니다'}
          </p>
        </div>
      )}

      {/* 에러 상태 (mutation 에러) */}
      {queryMutation.isError && !result && (
        <div className="glass border border-rose-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 text-rose-400">
            <Search className="w-5 h-5" />
            <span>질의 실행 중 오류가 발생했습니다. 다시 시도해주세요.</span>
          </div>
        </div>
      )}

      {/* 결과 표시 (후속 질문 섹션 제외 - FollowUpPanel에서 관리) */}
      {result && !queryMutation.isPending && (
        <ResponseContainer
          response={{
            ...result,
            followUp: undefined, // 후속 질문은 FollowUpPanel에서 관리
          }}
          onFollowUpClick={handleFollowUpClick}
          onRetry={handleRetry}
        />
      )}

      {/* 명확화 모달 */}
      {showClarificationModal && clarification && (
        <ClarificationModal
          clarification={clarification}
          originalQuery={originalQuery}
          onSubmit={handleClarificationSubmit}
          onCancel={handleClarificationCancel}
        />
      )}
    </div>
  );
}
