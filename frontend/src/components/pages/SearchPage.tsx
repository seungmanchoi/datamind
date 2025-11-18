import { useState } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api, type SemanticSearchResponse } from '@/lib/api';
import { cn } from '@/lib/utils';

type SearchType = 'semantic' | 'hybrid';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('semantic');
  const [topK, setTopK] = useState(10);
  const [result, setResult] = useState<SemanticSearchResponse | null>(null);

  const searchMutation = useMutation({
    mutationFn: ({ query, type, topK }: { query: string; type: SearchType; topK: number }) => {
      return type === 'semantic'
        ? api.semanticSearch(query, topK)
        : api.hybridSearch(query, topK);
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
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-100">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          시맨틱 검색
        </h2>
        <p className="text-gray-600">
          의미 기반으로 상품, 옵션, 매장을 검색하세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 신선한 채소"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={searchMutation.isPending}
            />
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="searchType"
                value="semantic"
                checked={searchType === 'semantic'}
                onChange={(e) => setSearchType(e.target.value as SearchType)}
                className="w-4 h-4 text-purple-600"
                disabled={searchMutation.isPending}
              />
              <span className="text-gray-700">시맨틱 검색</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer ml-4">
              <input
                type="radio"
                name="searchType"
                value="hybrid"
                checked={searchType === 'hybrid'}
                onChange={(e) => setSearchType(e.target.value as SearchType)}
                className="w-4 h-4 text-purple-600"
                disabled={searchMutation.isPending}
              />
              <span className="text-gray-700">하이브리드 검색</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={searchMutation.isPending || !query.trim()}
            className={cn(
              'px-6 py-3 bg-purple-600 text-white rounded-lg font-medium',
              'hover:bg-purple-700 transition-colors flex items-center gap-2',
              'disabled:opacity-50 disabled:cursor-not-allowed'
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
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-purple-700 font-medium">검색 중입니다...</p>
        </div>
      )}

      {result && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">검색어</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded mt-2">{result.query}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                {result.searchType === 'semantic' ? '시맨틱' : '하이브리드'}
              </span>
            </div>
          </div>

          {result.results && result.results.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                검색 결과 ({result.results.length}건)
              </h3>
              <div className="space-y-3">
                {result.results.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{item.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">ID: {item.id}</p>
                        {item.metadata && (
                          <div className="text-xs text-gray-500 mt-2">
                            {JSON.stringify(item.metadata)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-purple-600">
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
            <div className="text-center py-8 text-gray-500">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
