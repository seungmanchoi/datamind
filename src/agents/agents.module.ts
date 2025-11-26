import { Module } from '@nestjs/common';

import { SearchModule } from '@/modules/search/search.module';
import { RagModule } from '@/rag/rag.module';

import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

@Module({
  imports: [SearchModule, RagModule],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentsModule {}
