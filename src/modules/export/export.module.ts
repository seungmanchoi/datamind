import { Module } from '@nestjs/common';

import { ExportController } from './export.controller';
import { ExportService } from './export.service';

/**
 * 데이터 내보내기 모듈
 * 엑셀, CSV 등 다양한 형식으로 데이터 내보내기 지원
 */
@Module({
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
