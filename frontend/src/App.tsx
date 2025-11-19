import { useState } from 'react';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import QueryPage from '@/components/pages/QueryPage';
import SearchPage from '@/components/pages/SearchPage';
import HistoryPage from '@/components/pages/HistoryPage';
import MetricsPage from '@/components/pages/MetricsPage';

type PageType = 'query' | 'search' | 'history' | 'metrics';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('query');

  const renderPage = () => {
    switch (currentPage) {
      case 'query':
        return <QueryPage />;
      case 'search':
        return <SearchPage />;
      case 'history':
        return <HistoryPage />;
      case 'metrics':
        return <MetricsPage />;
      default:
        return <QueryPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <Header />
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="container mx-auto px-4 py-8">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
