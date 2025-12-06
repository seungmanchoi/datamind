import {
  ChevronDown,
  ChevronUp,
  History,
  Layers,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  User,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

import type { FollowUpQuestion } from '@/lib/api';
import { cn } from '@/lib/utils';

// 확장된 후속 질문 타입 (출처 포함)
export interface ExtendedFollowUpQuestion extends FollowUpQuestion {
  source: 'ai' | 'user';
  timestamp: number;
}

interface Props {
  currentQuestions: FollowUpQuestion[]; // 현재 응답의 후속 질문
  historyQuestions: ExtendedFollowUpQuestion[]; // 히스토리 질문들
  onQuestionClick: (query: string) => void;
  onAddQuestion: (question: ExtendedFollowUpQuestion) => void;
  onRemoveQuestion: (id: string) => void;
}

const categoryConfig: Record<
  FollowUpQuestion['category'],
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  deep_dive: {
    icon: Search,
    color: 'text-primary',
    bgColor: 'bg-primary/10 hover:bg-primary/20',
    label: '상세 분석',
  },
  comparison: {
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    label: '비교',
  },
  expansion: {
    icon: Layers,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10 hover:bg-violet-500/20',
    label: '확장',
  },
  action: {
    icon: Zap,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
    label: '액션',
  },
};

export default function FollowUpPanel({
  currentQuestions,
  historyQuestions,
  onQuestionClick,
  onAddQuestion,
  onRemoveQuestion,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FollowUpQuestion['category']>('deep_dive');

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;

    const question: ExtendedFollowUpQuestion = {
      id: `user_${Date.now()}`,
      text: newQuestion.trim(),
      category: selectedCategory,
      icon: categoryConfig[selectedCategory].label,
      autoQuery: newQuestion.trim(),
      source: 'user',
      timestamp: Date.now(),
    };

    onAddQuestion(question);
    setNewQuestion('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddQuestion();
    }
  };

  // 현재 질문과 히스토리 합치기 (중복 제거)
  const allQuestions = [...currentQuestions, ...historyQuestions].reduce((acc, q) => {
    if (!acc.find((existing) => existing.text === q.text)) {
      acc.push({
        ...q,
        source: (q as ExtendedFollowUpQuestion).source || 'ai',
        timestamp: (q as ExtendedFollowUpQuestion).timestamp || Date.now(),
      } as ExtendedFollowUpQuestion);
    }
    return acc;
  }, [] as ExtendedFollowUpQuestion[]);

  const hasQuestions = currentQuestions.length > 0 || historyQuestions.length > 0;

  if (!hasQuestions && !isExpanded) {
    return null;
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 border-b border-white/10 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/20 p-2 rounded-lg">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">후속 질문</h3>
            <p className="text-sm text-slate-400">{allQuestions.length}개의 질문 | 분석을 더 깊이 진행할 수 있습니다</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* 사용자 질문 입력 */}
          <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-white">질문 추가하기</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as FollowUpQuestion['category'])}
                  className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="deep_dive">상세 분석</option>
                  <option value="comparison">비교</option>
                  <option value="expansion">확장</option>
                  <option value="action">액션</option>
                </select>
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="궁금한 내용을 입력하세요..."
                  className="flex-1 px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
              <button
                onClick={handleAddQuestion}
                disabled={!newQuestion.trim()}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                추가
              </button>
            </div>
          </div>

          {/* 히스토리 토글 */}
          {historyQuestions.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              <History className="w-4 h-4" />
              <span>이전 질문 {showHistory ? '숨기기' : '보기'}</span>
              <span className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">{historyQuestions.length}</span>
            </button>
          )}

          {/* 현재 응답의 후속 질문 */}
          {currentQuestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>AI 추천 질문</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentQuestions.map((question) => {
                  const config = categoryConfig[question.category];
                  const Icon = config.icon;

                  return (
                    <button
                      key={question.id}
                      onClick={() => onQuestionClick(question.autoQuery || question.text)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-xl',
                        'border border-white/10 transition-all duration-200',
                        'hover:border-white/20 hover:shadow-lg',
                        config.bgColor,
                      )}
                    >
                      <Icon className={cn('w-4 h-4', config.color)} />
                      <span className="text-slate-200 text-sm">{question.text}</span>
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          config.bgColor.replace('hover:', ''),
                          config.color,
                        )}
                      >
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 히스토리 질문 */}
          {showHistory && historyQuestions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <History className="w-4 h-4" />
                <span>이전 질문</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {historyQuestions.map((question) => {
                  const config = categoryConfig[question.category];
                  const Icon = config.icon;
                  const isUserQuestion = question.source === 'user';

                  return (
                    <div
                      key={question.id}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 rounded-xl',
                        'border border-white/10 transition-all duration-200',
                        'hover:border-white/20 group',
                        isUserQuestion ? 'bg-slate-800/50' : config.bgColor.replace('hover:', ''),
                      )}
                    >
                      {isUserQuestion ? (
                        <User className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Icon className={cn('w-4 h-4', config.color)} />
                      )}
                      <button
                        onClick={() => onQuestionClick(question.autoQuery || question.text)}
                        className="text-slate-300 text-sm hover:text-white transition-colors"
                      >
                        {question.text}
                      </button>
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          isUserQuestion
                            ? 'bg-slate-700 text-slate-400'
                            : config.bgColor.replace('hover:', '') + ' ' + config.color,
                        )}
                      >
                        {isUserQuestion ? '사용자' : config.label}
                      </span>
                      <button
                        onClick={() => onRemoveQuestion(question.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
                      >
                        <X className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 질문이 없을 때 */}
          {allQuestions.length === 0 && (
            <div className="text-center py-6 text-slate-400">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">아직 후속 질문이 없습니다.</p>
              <p className="text-xs mt-1">위 입력창에서 직접 질문을 추가하거나, 분석 후 AI 추천을 받아보세요.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
