import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

/**
 * 컬럼 정의 DTO
 */
export class ColumnDefinitionDto {
  @ApiProperty({ description: '컬럼 키 이름' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '컬럼 타입', enum: ['string', 'number', 'date', 'currency', 'percentage'] })
  @IsString()
  @IsNotEmpty()
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage';

  @ApiProperty({ description: '컬럼 레이블 (표시명)' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: '포맷 문자열', required: false })
  @IsString()
  @IsOptional()
  format?: string;
}

/**
 * 시트 데이터 DTO (다중 시트 지원)
 */
export class SheetDataDto {
  @ApiProperty({ description: '시트 이름 (탭명)' })
  @IsString()
  @IsNotEmpty()
  sheetName: string;

  @ApiProperty({
    description: '컬럼 정의 배열',
    type: [ColumnDefinitionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnDefinitionDto)
  columns: ColumnDefinitionDto[];

  @ApiProperty({
    description: '데이터 행 배열',
    type: [Object],
  })
  @IsArray()
  @IsNotEmpty()
  rows: Record<string, unknown>[];

  @ApiProperty({
    description: 'SQL 쿼리 (선택사항)',
    required: false,
  })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiProperty({
    description: '시트 설명 (선택사항)',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}

/**
 * 엑셀 내보내기 요청 DTO
 */
export class ExportExcelRequestDto {
  @ApiProperty({
    description: '쿼리 제목 (파일명에 사용)',
    example: '이번 달 매출 TOP 10 상품',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: '컬럼 정의 배열',
    type: [ColumnDefinitionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnDefinitionDto)
  columns: ColumnDefinitionDto[];

  @ApiProperty({
    description: '데이터 행 배열',
    type: [Object],
  })
  @IsArray()
  @IsNotEmpty()
  rows: Record<string, unknown>[];

  @ApiProperty({
    description: 'SQL 쿼리 (시트에 포함, 선택사항)',
    required: false,
  })
  @IsString()
  @IsOptional()
  query?: string;
}

/**
 * 다중 시트 엑셀 내보내기 요청 DTO
 */
export class ExportMultiSheetExcelRequestDto {
  @ApiProperty({
    description: '파일 제목 (파일명에 사용)',
    example: '이번 달 매출 분석',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: '시트 데이터 배열',
    type: [SheetDataDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SheetDataDto)
  sheets: SheetDataDto[];

  @ApiProperty({
    description: '인사이트 요약 (선택사항)',
    required: false,
  })
  @IsString()
  @IsOptional()
  insightSummary?: string;
}

/**
 * PDF 내보내기 요청 DTO
 */
export class ExportPdfRequestDto {
  @ApiProperty({
    description: '제목',
    example: '매출 분석 리포트',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: '인사이트 요약',
  })
  @IsString()
  @IsNotEmpty()
  insightSummary: string;

  @ApiProperty({
    description: '인사이트 항목들',
    type: [Object],
    required: false,
  })
  @IsArray()
  @IsOptional()
  insightItems?: Array<{
    type: string;
    title: string;
    content: string;
    importance: string;
  }>;

  @ApiProperty({
    description: '데이터 테이블 (요약용)',
    required: false,
  })
  @IsOptional()
  dataTable?: {
    columns: ColumnDefinitionDto[];
    rows: Record<string, unknown>[];
  };

  @ApiProperty({
    description: '원본 질의',
    required: false,
  })
  @IsString()
  @IsOptional()
  query?: string;
}

/**
 * 엑셀 변환 가능 여부 응답 DTO
 */
export interface ExcelExportableResponse {
  exportable: boolean;
  reason?: string;
  rowCount?: number;
  columnCount?: number;
}
