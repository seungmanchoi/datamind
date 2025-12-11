import { useMutation } from '@tanstack/react-query';
import { Loader2, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { type SemanticSearchResponse, api } from '@/lib/api';
import { cn } from '@/lib/utils';

type SearchType = 'semantic' | 'hybrid';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('semantic');
  const [topK, setTopK] = useState(10);
  const [result, setResult] = useState<SemanticSearchResponse | null>(null);

  const searchMutation = useMutation({
    mutationFn: ({ query, type, topK }: { query: string; type: SearchType; topK: number }) => {
      return type === 'semantic' ? api.semanticSearch(query, topK) : api.hybridSearch(query, topK);
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error) => {
      console.error('Search error:', error);
      alert('검색 중 오류가 발생했습니다.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      searchMutation.mutate({ query: query.trim(), type: searchType, topK });
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass p-8 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-3">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2.5 rounded-xl shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          시맨틱 검색
        </h2>
        <p className="text-slate-400 leading-relaxed">의미 기반으로 상품, 옵션, 매장을 검색하세요.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-2xl shadow-lg p-6 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 신선한 채소"
              className="w-full px-5 py-3.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-white placeholder:text-slate-500"
              disabled={searchMutation.isPending}
            />
          </div>
          <div className="w-32">
            <input
              type="number"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              min="1"
              max="50"
              className="w-full px-4 py-3.5 bg-slate-900/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all text-white text-center"
              disabled={searchMutation.isPending}
            />
          </div>
        </div>

        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="searchType"
                value="semantic"
                checked={searchType === 'semantic'}
                onChange={(e) => setSearchType(e.target.value as SearchType)}
                className="w-4 h-4 text-purple-600 bg-slate-900 border-white/20"
                disabled={searchMutation.isPending}
              />
              <span className="text-slate-300">시맨틱 검색</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="searchType"
                value="hybrid"
                checked={searchType === 'hybrid'}
                onChange={(e) => setSearchType(e.target.value as SearchType)}
                className="w-4 h-4 text-purple-600 bg-slate-900 border-white/20"
                disabled={searchMutation.isPending}
              />
              <span className="text-slate-300">하이브리드 검색</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={searchMutation.isPending || !query.trim()}
            className={cn(
              'px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium',
              'hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center gap-2',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
            )}
          >
            {searchMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                검색 중...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                검색 실행
              </>
            )}
          </button>
        </div>
      </form>

      {searchMutation.isPending && (
        <div className="glass border border-purple-500/20 rounded-2xl p-8 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-purple-400 font-medium text-lg">검색 중입니다...</p>
        </div>
      )}

      {result && (
        <div className="glass rounded-2xl p-8 space-y-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">검색어</h3>
              <p className="text-slate-200 bg-white/5 p-4 rounded-xl border border-white/10">{result.query}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl text-sm font-medium border border-purple-500/20">
                {result.searchType === 'semantic' ? '시맨틱' : '하이브리드'}
              </span>
            </div>
          </div>

          {result.results && result.results.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">검색 결과 ({result.results.length}건)</h3>
              <div className="space-y-3">
                {result.results.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-lg">{item.name}</h4>
                        <p className="text-sm text-slate-400 mt-1">ID: {item.id}</p>
                        {item.metadata && (
                          <div className="text-xs text-slate-500 mt-2 bg-white/5 p-2 rounded-lg">
                            {JSON.stringify(item.metadata)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg">
                          Score: {item.score.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!result.results || result.results.length === 0) && (
            <div className="text-center py-12 text-slate-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
