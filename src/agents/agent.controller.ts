import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';

import { AgentService } from './agent.service';

interface TestPromptDto {
  prompt: string;
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
}
