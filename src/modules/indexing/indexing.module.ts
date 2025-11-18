import { Module } from '@nestjs/common';

import { EmbeddingsService } from '@/common/embeddings.service';
import { OpenSearchService } from '@/common/opensearch.service';

import { IndexingController } from './indexing.controller';
import { IndexingService } from './indexing.service';

@Module({
  controllers: [IndexingController],
  providers: [IndexingService, EmbeddingsService, OpenSearchService],
  exports: [IndexingService],
})
export class IndexingModule {}
