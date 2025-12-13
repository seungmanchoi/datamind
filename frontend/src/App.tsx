import { useState } from 'react';

import { ToastProvider } from '@/components/common/Toast';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import EmbeddingPage from '@/components/pages/EmbeddingPage';
import FailedQueriesPage from '@/components/pages/FailedQueriesPage';
import HistoryPage from '@/components/pages/HistoryPage';
import MetricsPage from '@/components/pages/MetricsPage';
import MultiAgentPage from '@/components/pages/MultiAgentPage';
import QueryPage from '@/components/pages/QueryPage';
import SearchPage from '@/components/pages/SearchPage';

type PageType = 'query' | 'multi-agent' | 'search' | 'embedding' | 'failed-queries' | 'history' | 'metrics';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('query');

  const renderPage = () => {
    switch (currentPage) {
      case 'query':
        return <QueryPage />;
      case 'multi-agent':
        return <MultiAgentPage />;
      case 'search':
        return <SearchPage />;
      case 'embedding':
        return <EmbeddingPage />;
      case 'failed-queries':
        return <FailedQueriesPage />;
      case 'history':
        return <HistoryPage />;
      case 'metrics':
        return <MetricsPage />;
      default:
        return <QueryPage />;
    }
  };

  return (
    <ToastProvider>
      <div className="min-h-screen relative overflow-hidden text-slate-200 selection:bg-primary selection:text-white">
        {/* Background Effects */}
        <div className="fixed inset-0 bg-gradient-to-br from-bg-start to-bg-end -z-20" />
        <div className="fixed top-[-100px] left-[-100px] w-[400px] h-[400px] bg-primary rounded-full blur-[80px] opacity-20 animate-float -z-10" />
        <div className="fixed bottom-[-50px] right-[-50px] w-[300px] h-[300px] bg-accent rounded-full blur-[80px] opacity-20 animate-float-reverse -z-10" />

        <Header />
        <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />

        <main className="container mx-auto px-4 py-8 relative z-10">{renderPage()}</main>
      </div>
    </ToastProvider>
  );
}

export default App;
