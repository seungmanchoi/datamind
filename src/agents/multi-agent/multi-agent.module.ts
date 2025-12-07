import { Module } from '@nestjs/common';

import { SearchModule } from '@/modules/search/search.module';
import { RagModule } from '@/rag/rag.module';

import { MultiAgentController } from './multi-agent.controller';
import { MultiAgentService } from './multi-agent.service';

@Module({
  imports: [SearchModule, RagModule],
  controllers: [MultiAgentController],
  providers: [MultiAgentService],
  exports: [MultiAgentService],
})
export class MultiAgentModule {}
