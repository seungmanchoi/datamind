import { useState } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Code2,
  Rows3,
} from 'lucide-react';
import type { QueryHistoryItem } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  queries: QueryHistoryItem[];
}

export default function SqlQueryHistory({ queries }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (queries.length === 0) {
    return null;
  }

  const handleCopy = async (query: string, id: string) => {
    try {
      await navigator.clipboard.writeText(query);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatSql = (sql: string) => {
    // 간단한 SQL 포매팅 (키워드 강조)
    const keywords = [
      'SELECT',
      'FROM',
      'WHERE',
      'JOIN',
      'LEFT JOIN',
      'RIGHT JOIN',
      'INNER JOIN',
      'ON',
      'AND',
      'OR',
      'ORDER BY',
      'GROUP BY',
      'HAVING',
      'LIMIT',
      'AS',
      'COUNT',
      'SUM',
      'AVG',
      'MAX',
      'MIN',
      'DISTINCT',
      'IN',
      'NOT',
      'NULL',
      'IS',
      'LIKE',
      'BETWEEN',
      'CASE',
      'WHEN',
      'THEN',
      'ELSE',
      'END',
    ];

    let formatted = sql;
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(
        regex,
        `<span class="text-blue-400 font-semibold">${keyword}</span>`
      );
    });

    return formatted;
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gradient-to-r from-blue-600/20 to-cyan-600/20 px-6 py-4 border-b border-white/10 flex items-center justify-between hover:from-blue-600/30 hover:to-cyan-600/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/30 p-2 rounded-lg">
            <Database className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">SQL Query History</h3>
            <p className="text-sm text-slate-400">{queries.length}개 쿼리 실행</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {queries.map((item, index) => {
            const isQueryExpanded = expandedQuery === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  'glass rounded-xl overflow-hidden border transition-all',
                  item.success ? 'border-emerald-500/20' : 'border-rose-500/20'
                )}
              >
                {/* 쿼리 헤더 */}
                <button
                  onClick={() => setExpandedQuery(isQueryExpanded ? null : item.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        item.success ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                      )}
                    >
                      {item.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-white">Query #{index + 1}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.executionTime}ms
                        </span>
                        <span className="flex items-center gap-1">
                          <Rows3 className="w-3 h-3" />
                          {item.rowCount}행
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(item.query, item.id);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="쿼리 복사"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    {isQueryExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* 쿼리 본문 */}
                {isQueryExpanded && (
                  <div className="px-4 pb-4">
                    <div className="bg-slate-900/80 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                        <code
                          dangerouslySetInnerHTML={{ __html: formatSql(item.query) }}
                          className="text-slate-300"
                        />
                      </pre>
                    </div>
                    {item.error && (
                      <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                        <p className="text-sm text-rose-400">{item.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
