import { Module } from '@nestjs/common';

import { EmbeddingsService } from '@/common/embeddings.service';
import { OpenSearchService } from '@/common/opensearch.service';
import { SearchController } from '@/modules/search/search.controller';
import { SearchService } from '@/modules/search/search.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService, EmbeddingsService, OpenSearchService],
  exports: [SearchService],
})
export class SearchModule {}
