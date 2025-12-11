import { Search, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { type ClarificationSection } from '@/lib/api';

interface ClarificationModalProps {
  clarification: ClarificationSection;
  originalQuery: string;
  onSubmit: (clarifiedQuery: string) => void;
  onCancel: () => void;
}

/**
 * 질의 명확화 모달 컴포넌트
 * 사용자에게 추가 질문을 표시하고 답변을 받아 질의를 구체화합니다.
 */
export function ClarificationModal({ clarification, originalQuery, onSubmit, onCancel }: ClarificationModalProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // 기본값 설정
  useEffect(() => {
    if (clarification.questions) {
      const defaultAnswers: Record<number, string> = {};
      clarification.questions.forEach((q, index) => {
        defaultAnswers[index] = q.default;
      });
      setAnswers(defaultAnswers);
    }
  }, [clarification.questions]);

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const handleSubmit = () => {
    if (!clarification.questions) return;

    // 질문과 답변을 조합하여 구체화된 질의 생성
    const clarifiedParts = clarification.questions.map((q, idx) => `${q.question}: ${answers[idx] || q.default}`);

    const clarifiedQuery = `${originalQuery} (${clarifiedParts.join(', ')})`;
    onSubmit(clarifiedQuery);
  };

  // 질문 타입별 아이콘 및 색상
  const getQuestionStyle = (type: string) => {
    switch (type) {
      case 'period':
        return { icon: '📅', bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/20' };
      case 'limit':
        return { icon: '📊', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/20' };
      case 'filter':
        return { icon: '🔍', bgClass: 'bg-purple-500/10', borderClass: 'border-purple-500/20' };
      case 'grouping':
        return { icon: '📁', bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/20' };
      case 'category':
        return { icon: '🏷️', bgClass: 'bg-pink-500/10', borderClass: 'border-pink-500/20' };
      case 'order':
        return { icon: '↕️', bgClass: 'bg-cyan-500/10', borderClass: 'border-cyan-500/20' };
      default:
        return { icon: '❓', bgClass: 'bg-slate-500/10', borderClass: 'border-slate-500/20' };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10">
        {/* 헤더 */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary to-indigo-600 p-2 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            질문을 좀 더 구체화해주세요
          </h3>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-6">
          {/* 원본 질의 표시 */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <span className="text-sm text-slate-400 block mb-1">원본 질의</span>
            <p className="text-slate-200">{originalQuery}</p>
          </div>

          {/* 명확화 이유 */}
          {clarification.reason && (
            <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
              <p className="text-slate-200">{clarification.reason}</p>
            </div>
          )}

          {/* 질문 목록 */}
          {clarification.questions?.map((question, index) => {
            const style = getQuestionStyle(question.type);
            return (
              <div key={index} className={`p-4 rounded-xl ${style.bgClass} border ${style.borderClass}`}>
                <label className="block text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <span className="text-lg">{style.icon}</span>
                  {question.question}
                </label>
                <select
                  value={answers[index] || question.default}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-white"
                >
                  {question.options.map((option) => (
                    <option key={option} value={option} className="bg-slate-900 text-white">
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {/* 푸터 */}
        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-slate-300 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            다시 질의하기
          </button>
        </div>
      </div>
    </div>
  );
}
