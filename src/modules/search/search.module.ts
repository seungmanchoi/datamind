import { Module } from '@nestjs/common';

import { EmbeddingsService } from '@/common/embeddings.service';
import { OpenSearchService } from '@/common/opensearch.service';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService, EmbeddingsService, OpenSearchService],
  exports: [SearchService],
})
export class SearchModule {}
