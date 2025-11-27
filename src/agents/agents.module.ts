import { Module } from '@nestjs/common';

import { AgentController } from '@/agents/agent.controller';
import { AgentService } from '@/agents/agent.service';
import { SearchModule } from '@/modules/search/search.module';
import { RagModule } from '@/rag/rag.module';

@Module({
  imports: [SearchModule, RagModule],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentsModule {}
