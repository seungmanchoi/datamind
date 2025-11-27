import { Module } from '@nestjs/common';

import { BedrockService } from '@/common/bedrock.service';
import { QueryController } from '@/modules/query/query.controller';
import { QueryMapper } from '@/modules/query/query.mapper';
import { QueryRepository } from '@/modules/query/query.repository';
import { QueryService } from '@/modules/query/query.service';
import { RagModule } from '@/rag/rag.module';

@Module({
  imports: [RagModule],
  controllers: [QueryController],
  providers: [QueryService, QueryRepository, QueryMapper, BedrockService],
  exports: [QueryService],
})
export class QueryModule {}
