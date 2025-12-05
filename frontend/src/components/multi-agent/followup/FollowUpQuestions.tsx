import { MessageCircle, Search, TrendingUp, Layers, Zap } from 'lucide-react';
import type { FollowUpQuestion } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  questions: FollowUpQuestion[];
  onQuestionClick?: (query: string) => void;
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

export default function FollowUpQuestions({ questions, onQuestionClick }: Props) {
  if (!questions.length) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/20 p-2 rounded-lg">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">후속 질문</h3>
            <p className="text-sm text-slate-400">분석을 더 깊이 진행할 수 있습니다</p>
          </div>
        </div>
      </div>

      {/* 질문 목록 */}
      <div className="p-4">
        <div className="flex flex-wrap gap-3">
          {questions.map((question) => {
            const config = categoryConfig[question.category];
            const Icon = config.icon;

            return (
              <button
                key={question.id}
                onClick={() => onQuestionClick?.(question.autoQuery || question.text)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl',
                  'border border-white/10 transition-all duration-200',
                  'hover:border-white/20 hover:shadow-lg',
                  config.bgColor
                )}
              >
                <Icon className={cn('w-4 h-4', config.color)} />
                <span className="text-slate-200 text-sm">{question.text}</span>
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    config.bgColor.replace('hover:', ''),
                    config.color
                  )}
                >
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
