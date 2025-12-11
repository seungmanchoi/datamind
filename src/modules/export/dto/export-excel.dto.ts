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
 * 엑셀 변환 가능 여부 응답 DTO
 */
export interface ExcelExportableResponse {
  exportable: boolean;
  reason?: string;
  rowCount?: number;
  columnCount?: number;
}
