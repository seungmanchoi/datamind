import { Check, ChevronDown, ChevronUp, Clock, Code, Copy, Download, Loader2, Table2 } from 'lucide-react';
import { useState } from 'react';

import type { ColumnDefinition } from '@/lib/api';
import { api } from '@/lib/api';
import { cn, formatCurrency, formatNumber, translateColumnName } from '@/lib/utils';

interface Props {
  columns: ColumnDefinition[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
  query?: string;
  title?: string;
  hideHeader?: boolean;
}

export default function DataTable({ columns, rows, rowCount, executionTime, query, title, hideHeader }: Props) {
  const [showQuery, setShowQuery] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // 엑셀 내보내기 가능 여부 (데이터가 있으면 가능)
  const canExport = rows.length > 0 && columns.length > 0;

  // 엑셀 다운로드 핸들러
  const handleExportExcel = async () => {
    if (!canExport || isExporting) return;

    setIsExporting(true);
    setExportError(null);

    try {
      const exportTitle = title || '데이터 결과';
      await api.exportToExcel(exportTitle, columns, rows, query);
    } catch (error) {
      console.error('Excel export failed:', error);
      setExportError('엑셀 다운로드에 실패했습니다.');
      setTimeout(() => setExportError(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyQuery = async () => {
    if (query) {
      await navigator.clipboard.writeText(query);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnName);
      setSortDirection('asc');
    }
  };

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    let comparison = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const formatValue = (value: unknown, column: ColumnDefinition): string => {
    if (value === null || value === undefined) return '-';

    switch (column.type) {
      case 'currency':
        return formatCurrency(Number(value));
      case 'number':
        return formatNumber(Number(value));
      case 'percentage':
        return `${Number(value).toFixed(1)}%`;
      case 'date':
        return new Date(String(value)).toLocaleDateString('ko-KR');
      default:
        return String(value);
    }
  };

  return (
    <div className={cn('overflow-hidden', !hideHeader && 'glass rounded-2xl')}>
      {/* 헤더 - hideHeader가 true면 숨김 */}
      {!hideHeader && (
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <Table2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">데이터 결과</h3>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <span>{rowCount.toLocaleString()}개 행</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {executionTime}ms
                  </span>
                </div>
              </div>
            </div>

            {/* 버튼 그룹 */}
            <div className="flex items-center gap-2">
              {/* 엑셀 다운로드 버튼 */}
              {canExport && (
                <button
                  onClick={handleExportExcel}
                  disabled={isExporting}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm',
                    isExporting
                      ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300',
                  )}
                  title="엑셀로 다운로드"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {isExporting ? '다운로드 중...' : '엑셀 다운로드'}
                </button>
              )}

              {/* SQL 쿼리 토글 */}
              {query && (
                <button
                  onClick={() => setShowQuery(!showQuery)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10
                           text-slate-400 hover:text-white rounded-lg transition-colors text-sm"
                >
                  <Code className="w-4 h-4" />
                  SQL 쿼리 {showQuery ? '숨기기' : '보기'}
                </button>
              )}
            </div>
          </div>

          {/* SQL 쿼리 표시 */}
          {showQuery && query && (
            <div className="mt-4 relative">
              <pre className="bg-slate-900/50 p-4 rounded-lg text-sm text-slate-300 overflow-x-auto border border-white/5">
                <code>{query}</code>
              </pre>
              <button
                onClick={handleCopyQuery}
                className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20
                         rounded-lg transition-colors"
                title="복사"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          )}

          {/* 에러 메시지 */}
          {exportError && (
            <div className="mt-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{exportError}</p>
            </div>
          )}
        </div>
      )}

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900/50">
              {columns.map((column) => (
                <th
                  key={column.name}
                  onClick={() => column.sortable !== false && handleSort(column.name)}
                  className={cn(
                    'px-4 py-3 text-left text-sm font-semibold text-slate-300',
                    column.sortable !== false && 'cursor-pointer hover:bg-white/5',
                  )}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    <span>{translateColumnName(column.label || column.name)}</span>
                    {sortColumn === column.name &&
                      (sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary" />
                      ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                {columns.map((column) => (
                  <td
                    key={column.name}
                    className={cn(
                      'px-4 py-3 text-sm',
                      column.type === 'number' || column.type === 'currency' || column.type === 'percentage'
                        ? 'text-right text-slate-200'
                        : 'text-slate-300',
                    )}
                  >
                    {formatValue(row[column.name], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {sortedRows.length === 0 && <div className="py-12 text-center text-slate-400">데이터가 없습니다.</div>}
      </div>
    </div>
  );
}
