import { Module } from '@nestjs/common';

import { BedrockService } from '@/common/bedrock.service';

import { QueryController } from './query.controller';
import { QueryMapper } from './query.mapper';
import { QueryRepository } from './query.repository';
import { QueryService } from './query.service';

@Module({
  controllers: [QueryController],
  providers: [QueryService, QueryRepository, QueryMapper, BedrockService],
  exports: [QueryService],
})
export class QueryModule {}
