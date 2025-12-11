import { BarChart, Box, History, MessageSquare, Search, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

type PageType = 'query' | 'multi-agent' | 'search' | 'embedding' | 'history' | 'metrics';

interface NavigationProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const navItems = [
  { id: 'query' as const, label: 'AI 질의', icon: MessageSquare },
  { id: 'multi-agent' as const, label: 'Multi-Agent', icon: Users },
  { id: 'search' as const, label: '시맨틱 검색', icon: Search },
  { id: 'embedding' as const, label: 'AI 학습', icon: Box },
  { id: 'history' as const, label: '히스토리', icon: History },
  { id: 'metrics' as const, label: '메트릭', icon: BarChart },
];

export default function Navigation({ currentPage, onPageChange }: NavigationProps) {
  return (
    <nav className="container mx-auto px-4 py-6">
      <div className="flex flex-wrap gap-2 p-1.5 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 w-fit">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              currentPage === item.id
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5',
            )}
          >
            <item.icon className={cn('w-4 h-4', currentPage === item.id ? 'animate-pulse' : '')} />
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
