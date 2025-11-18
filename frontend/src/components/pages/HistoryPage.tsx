import { useState, useEffect } from 'react';
import { History, Trash2, Clock, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type QueryResult } from '@/lib/api';

interface HistoryItem {
  query: string;
  result: {
    sql: string;
    results: QueryResult[];
    summary: string;
    executionTime: number;
  };
  timestamp: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    const storedHistory = localStorage.getItem('query_history');
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory) as HistoryItem[]);
    }
  }, []);

  const clearHistory = () => {
    if (confirm('모든 히스토리를 삭제하시겠습니까?')) {
      localStorage.removeItem('query_history');
      setHistory([]);
      setSelectedItem(null);
    }
  };

  const deleteItem = (index: number) => {
    const newHistory = history.filter((_, idx) => idx !== index);
    localStorage.setItem('query_history', JSON.stringify(newHistory));
    setHistory(newHistory);
    if (selectedItem === history[index]) {
      setSelectedItem(null);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-lg border border-green-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-2">
              <History className="w-6 h-6 text-green-600" />
              질의 히스토리
            </h2>
            <p className="text-gray-600">
              과거 질의 내역을 확인하고 재사용할 수 있습니다.
            </p>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              전체 삭제
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">저장된 히스토리가 없습니다.</p>
          <p className="text-gray-400 text-sm mt-2">
            AI 질의 페이지에서 질의를 실행하면 자동으로 저장됩니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 히스토리 목록 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              최근 질의 ({history.length}건)
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-4 bg-white border rounded-lg cursor-pointer transition-all',
                    selectedItem === item
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                  )}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 line-clamp-2">
                        {item.query}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(item.timestamp)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          {item.result.executionTime}ms
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(idx);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 상세 내용 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {selectedItem ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">질의</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">
                    {selectedItem.query}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">생성된 SQL</h3>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
                    <code>{selectedItem.result.sql}</code>
                  </pre>
                </div>

                {selectedItem.result.results && selectedItem.result.results.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      결과 ({selectedItem.result.results.length}건)
                    </h3>
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200 border text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {Object.keys(selectedItem.result.results[0]).map((key) => (
                              <th
                                key={key}
                                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedItem.result.results.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              {Object.values(row).map((value, cellIdx) => (
                                <td
                                  key={cellIdx}
                                  className="px-3 py-2 whitespace-nowrap text-gray-700"
                                >
                                  {String(value ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedItem.result.summary && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">요약</h3>
                    <p className="text-gray-700 bg-green-50 p-4 rounded border border-green-100">
                      {selectedItem.result.summary}
                    </p>
                  </div>
                )}

                <div className="text-sm text-gray-500 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span>실행 시간: {selectedItem.result.executionTime}ms</span>
                    <span>{formatTimestamp(selectedItem.timestamp)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>히스토리 항목을 선택하세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
