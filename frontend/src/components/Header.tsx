import { BarChart3 } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/30">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            NDMarket <span className="font-light text-primary">Insight</span>
          </h1>
        </div>
      </div>
    </header>
  );
}
