import { Clock, Database, History, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { type QueryResult } from '@/lib/api';
import { cn } from '@/lib/utils';

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
      <div className="glass p-8 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-3">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
                <History className="w-5 h-5 text-white" />
              </div>
              질의 히스토리
            </h2>
            <p className="text-slate-400 leading-relaxed">과거 질의 내역을 확인하고 재사용할 수 있습니다.</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/30 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              전체 삭제
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">저장된 히스토리가 없습니다.</p>
          <p className="text-slate-500 text-sm mt-2">AI 질의 페이지에서 질의를 실행하면 자동으로 저장됩니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 히스토리 목록 */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white mb-3">최근 질의 ({history.length}건)</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-4 glass rounded-xl cursor-pointer transition-all',
                    selectedItem === item
                      ? 'border-2 border-emerald-500 bg-emerald-500/10'
                      : 'border border-white/10 hover:border-emerald-500/50 hover:bg-white/5',
                  )}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-white line-clamp-2">{item.query}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
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
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
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
          <div className="glass rounded-2xl p-6">
            {selectedItem ? (
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">질의</h3>
                  <p className="text-slate-200 bg-white/5 p-4 rounded-xl border border-white/10">
                    {selectedItem.query}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-2">생성된 SQL</h3>
                  <pre className="bg-slate-950 text-emerald-300 p-5 rounded-xl overflow-x-auto border border-white/10 font-mono text-sm">
                    <code>{selectedItem.result.sql}</code>
                  </pre>
                </div>

                {selectedItem.result.results && selectedItem.result.results.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">결과 ({selectedItem.result.results.length}건)</h3>
                    <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-white/10">
                      <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/5 sticky top-0">
                          <tr>
                            {Object.keys(selectedItem.result.results[0]).map((key) => (
                              <th
                                key={key}
                                className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider"
                              >
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {selectedItem.result.results.map((row, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                              {Object.values(row).map((value, cellIdx) => (
                                <td key={cellIdx} className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">
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
                    <h3 className="text-lg font-bold text-white mb-2">요약</h3>
                    <p className="text-slate-200 bg-emerald-500/10 p-5 rounded-xl border border-emerald-500/20">
                      {selectedItem.result.summary}
                    </p>
                  </div>
                )}

                <div className="text-sm text-slate-500 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span>실행 시간: {selectedItem.result.executionTime}ms</span>
                    <span>{formatTimestamp(selectedItem.timestamp)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 py-20">
                <div className="text-center">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
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
