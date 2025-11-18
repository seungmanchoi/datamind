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
    <nav className="bg-white shadow-md border-b">
      <div className="container mx-auto px-4">
        <div className="flex gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={cn(
                  'flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap',
                  'border-b-2 hover:bg-gray-50',
                  isActive
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
