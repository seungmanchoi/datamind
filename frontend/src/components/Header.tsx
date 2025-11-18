import { BarChart3 } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-8 h-8" />
            NDMarket AI Insight Platform
          </h1>
        </div>
      </div>
    </header>
  );
}
