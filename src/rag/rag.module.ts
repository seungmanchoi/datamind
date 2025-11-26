import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EmbeddingsService } from '@/common/embeddings.service';
import { OpenSearchService } from '@/common/opensearch.service';

import { RagService } from './rag.service';

/**
 * RAG Module
 * Text-to-SQL을 위한 RAG (Retrieval-Augmented Generation) 시스템
 */
@Module({
  imports: [ConfigModule],
  providers: [OpenSearchService, EmbeddingsService, RagService],
  exports: [RagService],
})
export class RagModule {}
