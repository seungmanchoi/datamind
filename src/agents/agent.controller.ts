import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';

import { AgentService } from '@/agents/agent.service';

interface TestPromptDto {
  prompt: string;
}

interface DataInsightDto {
  query: string;
}

@Controller('agents')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(private readonly agentService: AgentService) {}

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testPrompt(@Body() dto: TestPromptDto): Promise<{ response: string }> {
    this.logger.log(`Received test prompt: ${dto.prompt}`);

    try {
      const response = await this.agentService.testPrompt(dto.prompt);

      this.logger.log('Prompt test successful');

      return { response };
    } catch (error) {
      this.logger.error('Failed to test prompt', error);
      throw error;
    }
  }

  @Post('insight')
  @HttpCode(HttpStatus.OK)
  async getDataInsight(@Body() dto: DataInsightDto) {
    this.logger.log(`Received data insight request: ${dto.query}`);

    try {
      const result = await this.agentService.executeDataInsightWorkflow(dto.query);

      this.logger.log('Data insight workflow completed');

      return result;
    } catch (error) {
      this.logger.error('Failed to execute data insight workflow', error);
      throw error;
    }
  }
}
