import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';

import type { ColumnDefinition, InsightItem, MultiSqlDataSection, SqlDataSection } from '@/lib/api';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ExportButtonsProps {
  title: string;
  data?: {
    sql?: SqlDataSection;
    multiSql?: MultiSqlDataSection;
  };
  insights?: {
    summary: string;
    items: InsightItem[];
  };
}

export default function ExportButtons({ title, data, insights }: ExportButtonsProps) {
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // 다운로드 가능 여부 체크
  const hasData = !!(data?.sql || data?.multiSql);
  const hasInsights = !!(insights?.summary);

  // 다중 시트 엑셀 다운로드
  const handleExportMultiSheetExcel = async () => {
    if (isExportingExcel || !hasData) return;

    setIsExportingExcel(true);
    setExportError(null);

    try {
      const sheets: Array<{
        sheetName: string;
        columns: ColumnDefinition[];
        rows: Record<string, unknown>[];
        query?: string;
        description?: string;
      }> = [];

      // multiSql이 있으면 사용, 없으면 sql 사용
      if (data?.multiSql) {
        // 메인 쿼리
        const primary = data.multiSql.primary;
        sheets.push({
          sheetName: primary.label || '메인 결과',
          columns: primary.columns,
          rows: primary.rows,
          query: primary.query,
          description: primary.description || primary.explanation,
        });

        // 추가 쿼리들
        if (data.multiSql.additional) {
          data.multiSql.additional.forEach((additional, index) => {
            sheets.push({
              sheetName: additional.label || `추가 결과 ${index + 1}`,
              columns: additional.columns,
              rows: additional.rows,
              query: additional.query,
              description: additional.description || additional.explanation,
            });
          });
        }
      } else if (data?.sql) {
        sheets.push({
          sheetName: data.sql.label || '데이터 결과',
          columns: data.sql.columns,
          rows: data.sql.rows,
          query: data.sql.query,
          description: data.sql.description || data.sql.explanation,
        });
      }

      await api.exportToMultiSheetExcel(title, sheets, insights?.summary);
    } catch (error) {
      console.error('Excel export failed:', error);
      setExportError('엑셀 다운로드에 실패했습니다.');
      setTimeout(() => setExportError(null), 3000);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // PDF 다운로드
  const handleExportPdf = async () => {
    if (isExportingPdf || !hasInsights) return;

    setIsExportingPdf(true);
    setExportError(null);

    try {
      // 인사이트 아이템 변환
      const insightItems = insights?.items?.map((item) => ({
        type: item.type,
        title: item.title,
        content: item.content,
        importance: item.importance,
      }));

      // 데이터 테이블 (메인 결과만)
      const sqlData = data?.multiSql?.primary || data?.sql;
      const dataTable = sqlData
        ? {
            columns: sqlData.columns,
            rows: sqlData.rows.slice(0, 20), // 요약용으로 최대 20행
          }
        : undefined;

      await api.exportToPdf(title, insights?.summary || '', insightItems, dataTable, sqlData?.query);
    } catch (error) {
      console.error('PDF export failed:', error);
      setExportError('PDF 다운로드에 실패했습니다.');
      setTimeout(() => setExportError(null), 3000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!hasData && !hasInsights) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Download className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-400">내보내기</span>
      </div>

      <div className="flex items-center gap-2">
        {/* 다중 시트 엑셀 다운로드 */}
        {hasData && (
          <button
            onClick={handleExportMultiSheetExcel}
            disabled={isExportingExcel}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm',
              isExportingExcel
                ? 'bg-emerald-500/20 text-emerald-400 cursor-not-allowed'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300',
            )}
            title="엑셀 파일로 다운로드 (다중 시트)"
          >
            {isExportingExcel ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            {isExportingExcel ? '다운로드 중...' : '엑셀 다운로드'}
            {data?.multiSql && data.multiSql.totalQueries > 1 && (
              <span className="text-xs bg-emerald-500/30 px-1.5 py-0.5 rounded">
                {data.multiSql.totalQueries}개 시트
              </span>
            )}
          </button>
        )}

        {/* PDF 다운로드 */}
        {hasInsights && (
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm',
              isExportingPdf
                ? 'bg-red-500/20 text-red-400 cursor-not-allowed'
                : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300',
            )}
            title="인사이트를 PDF로 다운로드"
          >
            {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {isExportingPdf ? '다운로드 중...' : 'PDF 다운로드'}
          </button>
        )}
      </div>

      {/* 에러 메시지 */}
      {exportError && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{exportError}</p>
        </div>
      )}
    </div>
  );
}
