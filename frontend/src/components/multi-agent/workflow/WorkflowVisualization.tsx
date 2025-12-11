import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code,
  Cpu,
  Database,
  FileText,
  GitBranch,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Play,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

import type { WorkflowStep, WorkflowStepDetailType } from '@/lib/api';
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

/**
 * 밀리초를 사람이 읽기 쉬운 형태로 변환
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}

// 상세 정보 타입별 아이콘 및 스타일
const detailTypeConfig: Record<WorkflowStepDetailType, { icon: React.ElementType; color: string }> = {
  query: { icon: Code, color: 'text-blue-400' },
  result: { icon: FileText, color: 'text-emerald-400' },
  insight: { icon: Lightbulb, color: 'text-amber-400' },
  chart: { icon: BarChart3, color: 'text-pink-400' },
  decision: { icon: ArrowRight, color: 'text-violet-400' },
  question: { icon: HelpCircle, color: 'text-cyan-400' },
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
                      index % 2 === 0 ? 'flex-row' : 'flex-row-reverse',
                    )}
                  >
                    {/* 왼쪽/오른쪽 카드 */}
                    <div className={cn('flex-1 max-w-[45%]', index % 2 === 0 ? 'text-right pr-4' : 'text-left pl-4')}>
                      <button
                        onClick={() => setSelectedStep(isSelected ? null : step.id)}
                        className={cn(
                          'inline-block glass rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer text-left w-full',
                          isSelected && 'ring-2 ring-primary/50',
                        )}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={cn('p-2 rounded-lg', config.bgColor)}>
                            <Icon className={cn('w-4 h-4', config.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white truncate">{step.agentDisplayName}</h4>
                          </div>
                          <div className={cn('flex items-center gap-1', status.color)}>
                            <StatusIcon className="w-4 h-4" />
                          </div>
                        </div>
                        {/* 요약 (항상 표시) */}
                        {step.summary && <p className="text-xs text-slate-300 mt-1">{step.summary}</p>}

                        {step.duration !== undefined && step.duration > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1 text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span>{formatDuration(step.duration)}</span>
                              </div>
                              {totalDuration > 0 && (
                                <span className="text-slate-500">
                                  {((step.duration / totalDuration) * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                            {/* Duration Progress Bar */}
                            {totalDuration > 0 && (
                              <div className="w-full h-1 bg-slate-700/50 rounded-full overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full transition-all', config.bgColor.replace('/20', ''))}
                                  style={{ width: `${Math.min((step.duration / totalDuration) * 100, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* 확장된 상세 정보 */}
                        {isSelected && (step.details?.length || step.output) && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                            {/* 상세 정보 항목들 */}
                            {step.details && step.details.length > 0 && (
                              <div className="space-y-2">
                                {step.details.map((detail, idx) => {
                                  const detailConfig = detailTypeConfig[detail.type];
                                  const DetailIcon = detailConfig?.icon || FileText;
                                  const detailColor = detailConfig?.color || 'text-slate-400';

                                  return (
                                    <div key={idx} className="flex items-start gap-2">
                                      <DetailIcon className={cn('w-3 h-3 mt-0.5 flex-shrink-0', detailColor)} />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs text-slate-400">{detail.label}: </span>
                                        <span
                                          className={cn(
                                            'text-xs text-slate-200 break-words',
                                            detail.type === 'query' && 'font-mono bg-slate-800/50 px-1 py-0.5 rounded',
                                          )}
                                        >
                                          {detail.value.length > 150
                                            ? `${detail.value.substring(0, 150)}...`
                                            : detail.value}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* 상세 정보가 없고 output만 있는 경우 fallback */}
                            {(!step.details || step.details.length === 0) && step.output && (
                              <p className="text-xs text-slate-400 whitespace-pre-wrap break-words">
                                {step.output.length > 200 ? `${step.output.substring(0, 200)}...` : step.output}
                              </p>
                            )}
                          </div>
                        )}
                      </button>
                    </div>

                    {/* 중앙 노드 */}
                    <div className="relative z-10">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center border-2 border-white/20',
                          config.bgColor,
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

          {/* 하단 시간 분석 */}
          <div className="mt-6 pt-4 border-t border-white/10 space-y-4">
            {/* 에이전트별 시간 분석 바 차트 */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">에이전트별 소요 시간</h4>
              <div className="space-y-2">
                {uniqueAgents.map((step) => {
                  const config = agentConfig[step.agent] || {
                    icon: Bot,
                    color: 'text-slate-400',
                    bgColor: 'bg-slate-500/20',
                  };
                  const Icon = config.icon;
                  // 같은 에이전트의 모든 스텝 duration 합산
                  const agentTotalDuration = steps
                    .filter((s) => s.agent === step.agent)
                    .reduce((sum, s) => sum + (s.duration || 0), 0);
                  const percentage = totalDuration > 0 ? (agentTotalDuration / totalDuration) * 100 : 0;

                  return (
                    <div key={step.agent} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-32 flex-shrink-0">
                        <div className={cn('p-1 rounded', config.bgColor)}>
                          <Icon className={cn('w-3 h-3', config.color)} />
                        </div>
                        <span className="text-xs text-slate-300 truncate">{step.agentDisplayName}</span>
                      </div>
                      <div className="flex-1 h-4 bg-slate-700/30 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', config.bgColor.replace('/20', '/60'))}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-400 w-20 text-right flex-shrink-0">
                        {formatDuration(agentTotalDuration)}
                        <span className="text-slate-500 ml-1">({percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 에이전트 배지 */}
            <div className="flex flex-wrap gap-2">
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
                      config.color,
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
