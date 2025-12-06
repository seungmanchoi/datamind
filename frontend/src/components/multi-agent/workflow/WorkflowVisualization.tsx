import { useState } from 'react';
import {
  GitBranch,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  Search,
  BarChart3,
  Sparkles,
  MessageSquare,
  Bot,
} from 'lucide-react';
import type { WorkflowStep } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  steps: WorkflowStep[];
  totalDuration: number;
}

// 에이전트별 아이콘 및 색상
const agentConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  supervisor: { icon: Cpu, color: 'text-violet-400', bgColor: 'bg-violet-500/20' },
  sql_expert: { icon: Database, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  search_expert: { icon: Search, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  insight_analyst: { icon: Sparkles, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  chart_advisor: { icon: BarChart3, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  followup_agent: { icon: MessageSquare, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
};

const statusConfig = {
  pending: { icon: Clock, color: 'text-slate-400', label: '대기 중' },
  running: { icon: Play, color: 'text-blue-400', label: '실행 중' },
  completed: { icon: CheckCircle2, color: 'text-emerald-400', label: '완료' },
  error: { icon: XCircle, color: 'text-rose-400', label: '오류' },
};

export default function WorkflowVisualization({ steps, totalDuration }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);

  // 에이전트별로 그룹화 (supervisor 제외, 중복 제거)
  const uniqueAgents = steps
    .filter((s) => s.agent !== 'supervisor')
    .reduce((acc, step) => {
      if (!acc.find((s) => s.agent === step.agent)) {
        acc.push(step);
      }
      return acc;
    }, [] as WorkflowStep[]);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gradient-to-r from-violet-600/20 to-purple-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between hover:from-violet-600/30 hover:to-purple-600/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-violet-500/30 p-2 rounded-lg">
            <GitBranch className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">Agent Workflow</h3>
            <p className="text-sm text-slate-400">
              {uniqueAgents.length}개 에이전트 실행 | {totalDuration.toLocaleString()}ms
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-6">
          {/* 워크플로우 다이어그램 */}
          <div className="relative">
            {/* 연결선 */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/50 via-blue-500/50 to-emerald-500/50" />

            {/* 단계별 노드 */}
            <div className="space-y-4 relative">
              {steps.map((step, index) => {
                const config = agentConfig[step.agent] || {
                  icon: Bot,
                  color: 'text-slate-400',
                  bgColor: 'bg-slate-500/20',
                };
                const status = statusConfig[step.status];
                const Icon = config.icon;
                const StatusIcon = status.icon;
                const isSelected = selectedStep === step.id;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      'relative flex items-center gap-4',
                      index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                    )}
                  >
                    {/* 왼쪽/오른쪽 카드 */}
                    <div
                      className={cn(
                        'flex-1 max-w-[45%]',
                        index % 2 === 0 ? 'text-right pr-4' : 'text-left pl-4'
                      )}
                    >
                      <button
                        onClick={() => setSelectedStep(isSelected ? null : step.id)}
                        className={cn(
                          'inline-block glass rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer text-left w-full',
                          isSelected && 'ring-2 ring-primary/50'
                        )}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={cn('p-2 rounded-lg', config.bgColor)}>
                            <Icon className={cn('w-4 h-4', config.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white truncate">
                              {step.agentDisplayName}
                            </h4>
                          </div>
                          <div className={cn('flex items-center gap-1', status.color)}>
                            <StatusIcon className="w-4 h-4" />
                          </div>
                        </div>
                        {step.duration !== undefined && (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{step.duration}ms</span>
                          </div>
                        )}

                        {/* 확장된 출력 */}
                        {isSelected && step.output && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs text-slate-300 whitespace-pre-wrap break-words">
                              {step.output.length > 200
                                ? `${step.output.substring(0, 200)}...`
                                : step.output}
                            </p>
                          </div>
                        )}
                      </button>
                    </div>

                    {/* 중앙 노드 */}
                    <div className="relative z-10">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center border-2 border-white/20',
                          config.bgColor
                        )}
                      >
                        <span className="text-sm font-bold text-white">{index + 1}</span>
                      </div>
                    </div>

                    {/* 반대편 공간 */}
                    <div className="flex-1 max-w-[45%]" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 하단 요약 */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex flex-wrap gap-3">
              {uniqueAgents.map((step) => {
                const config = agentConfig[step.agent] || {
                  icon: Bot,
                  color: 'text-slate-400',
                  bgColor: 'bg-slate-500/20',
                };
                const Icon = config.icon;

                return (
                  <div
                    key={step.agent}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                      config.bgColor,
                      config.color
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{step.agentDisplayName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
