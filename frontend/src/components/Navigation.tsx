import { MessageSquare, Search, History, BarChart } from 'lucide-react';
import { cn } from '@/lib/utils';

type PageType = 'query' | 'search' | 'history' | 'metrics';

interface NavigationProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const navItems = [
  { id: 'query' as const, label: 'AI 질의', icon: MessageSquare },
  { id: 'search' as const, label: '시맨틱 검색', icon: Search },
  { id: 'history' as const, label: '히스토리', icon: History },
  { id: 'metrics' as const, label: '메트릭', icon: BarChart },
];

export default function Navigation({ currentPage, onPageChange }: NavigationProps) {
  return (
    <nav className="bg-white/60 backdrop-blur-md border-b border-gray-200/50">
      <div className="container mx-auto px-6 py-3">
        <div className="flex gap-3 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 font-medium transition-all whitespace-nowrap rounded-xl',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
