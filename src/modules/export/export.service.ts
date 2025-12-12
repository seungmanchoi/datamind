import * as ExcelJS from 'exceljs';
import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

import {
  ColumnDefinitionDto,
  ExcelExportableResponse,
  ExportExcelRequestDto,
  ExportMultiSheetExcelRequestDto,
  ExportPdfRequestDto,
  SheetDataDto,
} from './dto/export-excel.dto';

// 시트 색상 팔레트
const SHEET_COLORS = ['4F81BD', '9BBB59', 'C0504D', '8064A2', 'F79646', '4BACC6', '76923C', 'B65708'];

/**
 * 엑셀/PDF 내보내기 서비스
 * Multi-Agent 응답 데이터를 엑셀 파일 또는 PDF로 변환
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  // 엑셀 변환 가능한 최대 행 수 (성능 고려)
  private readonly MAX_ROWS = 100000;
  // 엑셀 변환 가능한 최소 행 수
  private readonly MIN_ROWS = 1;

  /**
   * 데이터가 엑셀로 변환 가능한지 판단
   */
  checkExportable(rows?: Record<string, unknown>[], columns?: ColumnDefinitionDto[]): ExcelExportableResponse {
    // 데이터가 없는 경우
    if (!rows || rows.length === 0) {
      return {
        exportable: false,
        reason: '내보낼 데이터가 없습니다.',
      };
    }

    // 컬럼이 없는 경우
    if (!columns || columns.length === 0) {
      return {
        exportable: false,
        reason: '컬럼 정의가 없습니다.',
      };
    }

    // 행 수가 너무 많은 경우
    if (rows.length > this.MAX_ROWS) {
      return {
        exportable: false,
        reason: `행 수가 너무 많습니다. (최대 ${this.MAX_ROWS.toLocaleString()}행)`,
        rowCount: rows.length,
        columnCount: columns.length,
      };
    }

    // 행 수가 너무 적은 경우
    if (rows.length < this.MIN_ROWS) {
      return {
        exportable: false,
        reason: '내보낼 데이터가 없습니다.',
        rowCount: rows.length,
        columnCount: columns.length,
      };
    }

    return {
      exportable: true,
      rowCount: rows.length,
      columnCount: columns.length,
    };
  }

  /**
   * 엑셀 파일 생성
   */
  async generateExcel(dto: ExportExcelRequestDto): Promise<Buffer> {
    this.logger.log(`Generating Excel: ${dto.title} (${dto.rows.length} rows)`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DataMind AI';
    workbook.created = new Date();

    // 데이터 시트 생성
    const dataSheet = workbook.addWorksheet('데이터', {
      properties: { tabColor: { argb: '4F81BD' } },
    });

    // 컬럼 헤더 설정
    dataSheet.columns = dto.columns.map((col) => ({
      header: col.label,
      key: col.name,
      width: this.calculateColumnWidth(col, dto.rows),
    }));

    // 헤더 스타일 적용
    const headerRow = dataSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F81BD' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // 데이터 행 추가
    dto.rows.forEach((row, index) => {
      const excelRow = dataSheet.addRow(row);

      // 셀 포맷 적용
      dto.columns.forEach((col, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        this.applyCellFormat(cell, col, row[col.name]);
      });

      // 짝수 행 배경색
      if (index % 2 === 1) {
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' },
        };
      }
    });

    // 필터 추가
    dataSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: dto.columns.length },
    };

    // 테두리 스타일 적용
    this.applyBorders(dataSheet, dto.rows.length + 1, dto.columns.length);

    // SQL 쿼리가 있으면 별도 시트에 추가
    if (dto.query) {
      const querySheet = workbook.addWorksheet('SQL 쿼리', {
        properties: { tabColor: { argb: '9BBB59' } },
      });
      querySheet.getCell('A1').value = 'SQL 쿼리:';
      querySheet.getCell('A1').font = { bold: true };
      querySheet.getCell('A2').value = dto.query;
      querySheet.getCell('A2').alignment = { wrapText: true };
      querySheet.getColumn('A').width = 100;
      querySheet.getRow(2).height = Math.min(dto.query.split('\n').length * 15, 300);
    }

    // 정보 시트 추가
    const infoSheet = workbook.addWorksheet('정보', {
      properties: { tabColor: { argb: 'C0504D' } },
    });
    this.addInfoSheet(infoSheet, dto);

    // Buffer로 변환
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * 컬럼 너비 계산
   */
  private calculateColumnWidth(col: ColumnDefinitionDto, rows: Record<string, unknown>[]): number {
    const headerWidth = col.label.length * 1.2 + 4;

    // 데이터 기반 너비 계산 (최대 20행만 샘플링)
    const sampleRows = rows.slice(0, 20);
    let maxDataWidth = 0;

    sampleRows.forEach((row) => {
      const value = row[col.name];
      if (value !== null && value !== undefined) {
        const strValue = this.formatValueForWidth(value, col);
        maxDataWidth = Math.max(maxDataWidth, strValue.length * 1.1);
      }
    });

    // 최소 8, 최대 50
    return Math.min(Math.max(Math.max(headerWidth, maxDataWidth), 8), 50);
  }

  /**
   * 너비 계산용 값 포맷
   */
  private formatValueForWidth(value: unknown, col: ColumnDefinitionDto): string {
    if (value === null || value === undefined) return '';

    switch (col.type) {
      case 'currency':
        return Number(value).toLocaleString('ko-KR') + '원';
      case 'number':
        return Number(value).toLocaleString('ko-KR');
      case 'percentage':
        return Number(value).toFixed(1) + '%';
      case 'date':
        return new Date(String(value)).toLocaleDateString('ko-KR');
      default:
        return String(value);
    }
  }

  /**
   * 셀 포맷 적용
   */
  private applyCellFormat(cell: ExcelJS.Cell, col: ColumnDefinitionDto, value: unknown): void {
    switch (col.type) {
      case 'currency':
        cell.numFmt = '#,##0"원"';
        cell.alignment = { horizontal: 'right' };
        break;
      case 'number':
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right' };
        break;
      case 'percentage':
        cell.numFmt = '0.0%';
        if (typeof value === 'number') {
          cell.value = value / 100; // 퍼센트는 0-1 범위로 변환
        }
        cell.alignment = { horizontal: 'right' };
        break;
      case 'date':
        cell.numFmt = 'YYYY-MM-DD';
        if (value && typeof value === 'string') {
          cell.value = new Date(value);
        }
        cell.alignment = { horizontal: 'center' };
        break;
      default:
        cell.alignment = { horizontal: 'left' };
    }
  }

  /**
   * 테두리 스타일 적용
   */
  private applyBorders(sheet: ExcelJS.Worksheet, rowCount: number, colCount: number): void {
    const borderStyle: Partial<ExcelJS.Border> = {
      style: 'thin',
      color: { argb: 'D0D0D0' },
    };

    for (let row = 1; row <= rowCount; row++) {
      for (let col = 1; col <= colCount; col++) {
        const cell = sheet.getCell(row, col);
        cell.border = {
          top: borderStyle,
          left: borderStyle,
          bottom: borderStyle,
          right: borderStyle,
        };
      }
    }
  }

  /**
   * 정보 시트 추가
   */
  private addInfoSheet(sheet: ExcelJS.Worksheet, dto: ExportExcelRequestDto): void {
    const infoData = [
      ['항목', '값'],
      ['제목', dto.title],
      ['생성일시', new Date().toLocaleString('ko-KR')],
      ['총 행 수', dto.rows.length.toLocaleString()],
      ['컬럼 수', dto.columns.length.toString()],
      ['생성 도구', 'DataMind AI'],
    ];

    infoData.forEach((row, index) => {
      const excelRow = sheet.addRow(row);
      if (index === 0) {
        excelRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'C0504D' },
        };
      }
    });

    sheet.getColumn('A').width = 15;
    sheet.getColumn('B').width = 40;
  }

  /**
   * 다중 시트 엑셀 파일 생성
   */
  async generateMultiSheetExcel(dto: ExportMultiSheetExcelRequestDto): Promise<Buffer> {
    this.logger.log(`Generating Multi-Sheet Excel: ${dto.title} (${dto.sheets.length} sheets)`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DataMind AI';
    workbook.created = new Date();

    // 각 시트 생성
    dto.sheets.forEach((sheetData, index) => {
      const sheetColor = SHEET_COLORS[index % SHEET_COLORS.length];
      this.addDataSheet(workbook, sheetData, sheetColor);
    });

    // 인사이트 요약 시트 추가 (있는 경우)
    if (dto.insightSummary) {
      this.addInsightSheet(workbook, dto.insightSummary);
    }

    // 정보 시트 추가
    this.addMultiSheetInfoSheet(workbook, dto);

    // Buffer로 변환
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * 데이터 시트 추가 (다중 시트용)
   */
  private addDataSheet(workbook: ExcelJS.Workbook, sheetData: SheetDataDto, color: string): void {
    // 시트명 정규화 (엑셀 시트명 제약: 최대 31자, 특수문자 제한)
    const sanitizedName = this.sanitizeSheetName(sheetData.sheetName);

    const sheet = workbook.addWorksheet(sanitizedName, {
      properties: { tabColor: { argb: color } },
    });

    // 시트 설명이 있으면 첫 행에 추가
    if (sheetData.description) {
      const descRow = sheet.addRow([sheetData.description]);
      descRow.font = { italic: true, color: { argb: '666666' } };
      sheet.addRow([]); // 빈 행
    }

    // 컬럼 헤더 설정
    const headerRowNum = sheetData.description ? 3 : 1;
    sheet.columns = sheetData.columns.map((col) => ({
      header: col.label,
      key: col.name,
      width: this.calculateColumnWidth(col, sheetData.rows),
    }));

    // 헤더 스타일 적용
    const headerRow = sheet.getRow(headerRowNum);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: color },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // 데이터 행 추가
    sheetData.rows.forEach((row, index) => {
      const excelRow = sheet.addRow(row);

      // 셀 포맷 적용
      sheetData.columns.forEach((col, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        this.applyCellFormat(cell, col, row[col.name]);
      });

      // 짝수 행 배경색
      if (index % 2 === 1) {
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' },
        };
      }
    });

    // 필터 추가
    const startRow = sheetData.description ? 3 : 1;
    sheet.autoFilter = {
      from: { row: startRow, column: 1 },
      to: { row: startRow, column: sheetData.columns.length },
    };

    // 테두리 스타일 적용
    this.applyBorders(sheet, sheetData.rows.length + startRow, sheetData.columns.length);
  }

  /**
   * 시트명 정규화
   */
  private sanitizeSheetName(name: string): string {
    // 엑셀 시트명 금지 문자 제거: \ / ? * [ ]
    let sanitized = name.replace(/[\\/?*[\]]/g, '_');
    // 최대 31자로 제한
    if (sanitized.length > 31) {
      sanitized = sanitized.substring(0, 28) + '...';
    }
    return sanitized || 'Sheet';
  }

  /**
   * 인사이트 요약 시트 추가
   */
  private addInsightSheet(workbook: ExcelJS.Workbook, summary: string): void {
    const sheet = workbook.addWorksheet('인사이트 요약', {
      properties: { tabColor: { argb: 'FFC000' } },
    });

    // 제목
    const titleRow = sheet.addRow(['📊 AI 분석 인사이트']);
    titleRow.font = { bold: true, size: 14 };
    titleRow.height = 30;

    sheet.addRow([]); // 빈 행

    // 요약 내용
    const summaryLines = summary.split('\n');
    summaryLines.forEach((line) => {
      const row = sheet.addRow([line]);
      row.alignment = { wrapText: true };
    });

    sheet.getColumn('A').width = 100;
  }

  /**
   * 다중 시트 정보 시트 추가
   */
  private addMultiSheetInfoSheet(workbook: ExcelJS.Workbook, dto: ExportMultiSheetExcelRequestDto): void {
    const sheet = workbook.addWorksheet('정보', {
      properties: { tabColor: { argb: '808080' } },
    });

    const totalRows = dto.sheets.reduce((sum, s) => sum + s.rows.length, 0);

    const infoData = [
      ['항목', '값'],
      ['제목', dto.title],
      ['생성일시', new Date().toLocaleString('ko-KR')],
      ['시트 수', dto.sheets.length.toString()],
      ['총 데이터 행 수', totalRows.toLocaleString()],
      ['생성 도구', 'DataMind AI'],
      ['', ''],
      ['시트 목록', '행 수'],
    ];

    // 각 시트 정보 추가
    dto.sheets.forEach((s) => {
      infoData.push([s.sheetName, s.rows.length.toString()]);
    });

    infoData.forEach((row, index) => {
      const excelRow = sheet.addRow(row);
      if (index === 0 || index === 7) {
        excelRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '808080' },
        };
      }
    });

    sheet.getColumn('A').width = 25;
    sheet.getColumn('B').width = 40;
  }

  /**
   * PDF 문서 생성
   */
  async generatePdf(dto: ExportPdfRequestDto): Promise<Buffer> {
    this.logger.log(`Generating PDF: ${dto.title}`);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: dto.title,
          Author: 'DataMind AI',
          Creator: 'DataMind AI Platform',
        },
      });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // 한글 폰트 등록 (시스템 기본 폰트 사용)
      // 주의: pdfkit은 기본적으로 한글을 지원하지 않으므로
      // 실제 배포 시에는 한글 폰트 파일을 포함해야 합니다.

      // 제목
      doc.fontSize(20).font('Helvetica-Bold').text(dto.title, { align: 'center' });
      doc.moveDown(0.5);

      // 생성 정보
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`Generated: ${new Date().toLocaleString('ko-KR')}`, { align: 'center' });
      doc.moveDown(2);

      // 원본 질의
      if (dto.query) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333').text('Query:');
        doc.fontSize(10).font('Helvetica').fillColor('#666666').text(dto.query);
        doc.moveDown(1.5);
      }

      // 인사이트 요약
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#333333').text('Analysis Summary');
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').fillColor('#000000');

      // 요약 내용 줄바꿈 처리
      const summaryLines = dto.insightSummary.split('\n');
      summaryLines.forEach((line) => {
        doc.text(line, { lineGap: 4 });
      });
      doc.moveDown(1.5);

      // 인사이트 항목들
      if (dto.insightItems && dto.insightItems.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#333333').text('Key Insights');
        doc.moveDown(0.5);

        dto.insightItems.forEach((item, index) => {
          // 중요도에 따른 색상
          const importanceColor =
            item.importance === 'high' ? '#DC2626' : item.importance === 'medium' ? '#F59E0B' : '#10B981';

          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor(importanceColor)
            .text(`${index + 1}. ${item.title}`);

          doc.fontSize(10).font('Helvetica').fillColor('#000000').text(item.content, { indent: 20 });
          doc.moveDown(0.5);
        });
        doc.moveDown(1);
      }

      // 데이터 테이블 (요약 - 처음 10행만)
      if (dto.dataTable && dto.dataTable.rows.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#333333').text('Data Summary');
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const colWidth = 450 / Math.min(dto.dataTable.columns.length, 5);
        const displayColumns = dto.dataTable.columns.slice(0, 5);
        const displayRows = dto.dataTable.rows.slice(0, 10);

        // 테이블 헤더
        doc.fontSize(9).font('Helvetica-Bold');
        displayColumns.forEach((col, i) => {
          doc.text(col.label.substring(0, 15), 50 + i * colWidth, tableTop, {
            width: colWidth - 5,
            align: 'left',
          });
        });

        // 구분선
        doc
          .moveTo(50, tableTop + 15)
          .lineTo(50 + displayColumns.length * colWidth, tableTop + 15)
          .stroke('#CCCCCC');

        // 데이터 행
        doc.fontSize(8).font('Helvetica');
        displayRows.forEach((row, rowIndex) => {
          const rowY = tableTop + 20 + rowIndex * 15;
          displayColumns.forEach((col, colIndex) => {
            const value = String(row[col.name] ?? '');
            doc.text(value.substring(0, 20), 50 + colIndex * colWidth, rowY, {
              width: colWidth - 5,
              align: col.type === 'number' || col.type === 'currency' ? 'right' : 'left',
            });
          });
        });

        // 추가 행이 있으면 표시
        if (dto.dataTable.rows.length > 10) {
          doc.moveDown(2);
          doc
            .fontSize(9)
            .fillColor('#666666')
            .text(`... and ${dto.dataTable.rows.length - 10} more rows`, { align: 'center' });
        }
      }

      // 푸터
      doc
        .fontSize(8)
        .fillColor('#999999')
        .text('Powered by DataMind AI', 50, doc.page.height - 50, { align: 'center' });

      doc.end();
    });
  }
}
