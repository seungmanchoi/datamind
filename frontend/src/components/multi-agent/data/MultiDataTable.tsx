import { Database, Download, FileSpreadsheet, Layers, Loader2 } from 'lucide-react';
import { useState } from 'react';

import type { ColumnDefinition, MultiSqlDataSection } from '@/lib/api';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

import DataTable from './DataTable';

interface Props {
  multiSql: MultiSqlDataSection;
  title?: string;
}

export default function MultiDataTable({ multiSql, title }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [isExportingSingle, setIsExportingSingle] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // 모든 데이터셋 합치기 (primary + additional)
  const allDatasets = [multiSql.primary, ...(multiSql.additional || [])];

  // 단일 쿼리면 일반 DataTable 사용
  if (allDatasets.length === 1) {
    return (
      <DataTable
        columns={multiSql.primary.columns}
        rows={multiSql.primary.rows}
        rowCount={multiSql.primary.rowCount}
        executionTime={multiSql.primary.executionTime}
        query={multiSql.primary.query}
        title={title}
      />
    );
  }

  const activeDataset = allDatasets[activeTab];

  // 전체 다운로드 (다중 시트)
  const handleExportAll = async () => {
    if (isExportingAll) return;

    setIsExportingAll(true);
    setExportError(null);

    try {
      const sheets: Array<{
        sheetName: string;
        columns: ColumnDefinition[];
        rows: Record<string, unknown>[];
        query?: string;
        description?: string;
      }> = allDatasets.map((dataset, index) => ({
        sheetName: dataset.label || `결과 ${index + 1}`,
        columns: dataset.columns,
        rows: dataset.rows,
        query: dataset.query,
        description: dataset.description,
      }));

      await api.exportToMultiSheetExcel(title || '데이터 결과', sheets);
    } catch (error) {
      console.error('Excel export failed:', error);
      setExportError('엑셀 다운로드에 실패했습니다.');
      setTimeout(() => setExportError(null), 3000);
    } finally {
      setIsExportingAll(false);
    }
  };

  // 개별 테이블 다운로드
  const handleExportSingle = async (index: number) => {
    if (isExportingSingle !== null) return;

    setIsExportingSingle(index);
    setExportError(null);

    try {
      const dataset = allDatasets[index];
      const sheets: Array<{
        sheetName: string;
        columns: ColumnDefinition[];
        rows: Record<string, unknown>[];
        query?: string;
        description?: string;
      }> = [
        {
          sheetName: dataset.label || `결과 ${index + 1}`,
          columns: dataset.columns,
          rows: dataset.rows,
          query: dataset.query,
          description: dataset.description,
        },
      ];

      await api.exportToMultiSheetExcel(dataset.label || title || '데이터 결과', sheets);
    } catch (error) {
      console.error('Excel export failed:', error);
      setExportError('엑셀 다운로드에 실패했습니다.');
      setTimeout(() => setExportError(null), 3000);
    } finally {
      setIsExportingSingle(null);
    }
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-violet-500/20 p-2 rounded-lg">
              <Layers className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">다중 데이터 결과</h3>
              <p className="text-sm text-slate-400">{multiSql.totalQueries}개의 쿼리 결과</p>
            </div>
          </div>

          {/* 전체 다운로드 버튼 */}
          <button
            onClick={handleExportAll}
            disabled={isExportingAll}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm',
              isExportingAll
                ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300',
            )}
            title="모든 데이터를 엑셀 파일로 다운로드 (시트 분리)"
          >
            {isExportingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            {isExportingAll ? '다운로드 중...' : '전체 다운로드'}
            <span className="text-xs bg-emerald-500/30 px-1.5 py-0.5 rounded">
              {allDatasets.length}개 시트
            </span>
          </button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="px-6 py-2 border-b border-white/10 bg-slate-900/30">
        <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {allDatasets.map((dataset, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all',
                activeTab === index
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300 border border-transparent',
              )}
            >
              <Database className="w-4 h-4" />
              <span>{dataset.label || `결과 ${index + 1}`}</span>
              <span className="text-xs bg-black/30 px-1.5 py-0.5 rounded">{dataset.rowCount}행</span>
            </button>
          ))}
        </div>
      </div>

      {/* 선택된 데이터셋 설명 및 개별 다운로드 */}
      <div className="px-6 py-3 bg-slate-900/20 border-b border-white/5 flex items-center justify-between">
        <div className="flex-1">
          {activeDataset.description && (
            <p className="text-sm text-slate-400">{activeDataset.description}</p>
          )}
          {!activeDataset.description && (
            <p className="text-sm text-slate-500">
              {activeDataset.label || `결과 ${activeTab + 1}`} - {activeDataset.rowCount}개 행
            </p>
          )}
        </div>

        {/* 개별 다운로드 버튼 */}
        <button
          onClick={() => handleExportSingle(activeTab)}
          disabled={isExportingSingle !== null}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors text-xs',
            isExportingSingle === activeTab
              ? 'bg-violet-500/20 text-violet-400 cursor-not-allowed'
              : 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 hover:text-violet-300',
          )}
          title="현재 탭 데이터만 엑셀로 다운로드"
        >
          {isExportingSingle === activeTab ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {isExportingSingle === activeTab ? '다운로드 중...' : '이 데이터만 다운로드'}
        </button>
      </div>

      {/* 에러 메시지 */}
      {exportError && (
        <div className="px-6 py-2 bg-red-500/10 border-b border-red-500/20">
          <p className="text-sm text-red-400">{exportError}</p>
        </div>
      )}

      {/* 선택된 데이터 테이블 */}
      <DataTable
        columns={activeDataset.columns}
        rows={activeDataset.rows}
        rowCount={activeDataset.rowCount}
        executionTime={activeDataset.executionTime}
        query={activeDataset.query}
        title={activeDataset.label || title}
        hideHeader
      />
    </div>
  );
}
