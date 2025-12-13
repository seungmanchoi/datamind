import { Module } from '@nestjs/common';

import { EmbeddingsService } from '@/common/embeddings.service';
import { OpenSearchService } from '@/common/opensearch.service';

import { QueryLearningController } from './query-learning.controller';
import { QueryLearningService } from './query-learning.service';

@Module({
  controllers: [QueryLearningController],
  providers: [QueryLearningService, OpenSearchService, EmbeddingsService],
  exports: [QueryLearningService],
})
export class QueryLearningModule {}
