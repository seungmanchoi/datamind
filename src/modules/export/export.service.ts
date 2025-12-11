import * as ExcelJS from 'exceljs';
import { Injectable, Logger } from '@nestjs/common';

import { ColumnDefinitionDto, ExcelExportableResponse, ExportExcelRequestDto } from './dto/export-excel.dto';

/**
 * 엑셀 내보내기 서비스
 * Multi-Agent 응답 데이터를 엑셀 파일로 변환
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
}
