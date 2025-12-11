import { Body, Controller, Header, Logger, Post, Res, StreamableFile } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { ExportExcelRequestDto } from './dto/export-excel.dto';
import { ExportService } from './export.service';

/**
 * 데이터 내보내기 컨트롤러
 */
@ApiTags('Export')
@Controller('export')
export class ExportController {
  private readonly logger = new Logger(ExportController.name);

  constructor(private readonly exportService: ExportService) {}

  /**
   * 데이터를 엑셀 파일로 내보내기
   */
  @Post('excel')
  @ApiOperation({
    summary: '엑셀 파일 내보내기',
    description: 'Multi-Agent 응답 데이터를 엑셀 파일로 변환하여 다운로드합니다.',
  })
  @ApiBody({ type: ExportExcelRequestDto })
  @ApiResponse({
    status: 200,
    description: '엑셀 파일 다운로드',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportToExcel(
    @Body() dto: ExportExcelRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.logger.log(`Export request: ${dto.title} (${dto.rows.length} rows)`);

    // 변환 가능 여부 확인
    const exportable = this.exportService.checkExportable(dto.rows, dto.columns);
    if (!exportable.exportable) {
      this.logger.warn(`Export rejected: ${exportable.reason}`);
      throw new Error(exportable.reason);
    }

    // 엑셀 파일 생성
    const buffer = await this.exportService.generateExcel(dto);

    // 파일명 설정 (한글 인코딩)
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${dto.title}_${timestamp}.xlsx`;
    const encodedFilename = encodeURIComponent(filename);

    res.set({
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
      'Content-Length': buffer.length,
    });

    this.logger.log(`Excel generated: ${filename} (${buffer.length} bytes)`);

    return new StreamableFile(buffer);
  }

  /**
   * 엑셀 변환 가능 여부 확인
   */
  @Post('excel/check')
  @ApiOperation({
    summary: '엑셀 변환 가능 여부 확인',
    description: '데이터가 엑셀로 변환 가능한지 확인합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        columns: { type: 'array', items: { type: 'object' } },
        rows: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '변환 가능 여부',
    schema: {
      type: 'object',
      properties: {
        exportable: { type: 'boolean' },
        reason: { type: 'string' },
        rowCount: { type: 'number' },
        columnCount: { type: 'number' },
      },
    },
  })
  checkExportable(
    @Body() body: { columns?: { name: string; type: string; label: string }[]; rows?: Record<string, unknown>[] },
  ) {
    return this.exportService.checkExportable(
      body.rows,
      body.columns as { name: string; type: 'string' | 'number' | 'date' | 'currency' | 'percentage'; label: string }[],
    );
  }
}
