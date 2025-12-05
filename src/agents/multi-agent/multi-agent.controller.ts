import { Body, Controller, Logger, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import { MultiAgentResponse } from '@/dto/response/multi-agent-response.dto';

import { MultiAgentService } from './multi-agent.service';

/**
 * Multi-Agent Query DTO
 */
class MultiAgentQueryDto {
  @ApiProperty({
    description: '자연어 질의',
    example: '이번 달 매출 TOP 10 상품을 분석해줘',
  })
  @IsString()
  @IsNotEmpty()
  query: string;
}

/**
 * Multi-Agent 컨트롤러
 * Supervisor 패턴 기반 에이전트 협업 API
 */
@ApiTags('Multi-Agent')
@Controller('multi-agent')
export class MultiAgentController {
  private readonly logger = new Logger(MultiAgentController.name);

  constructor(private readonly multiAgentService: MultiAgentService) {}

  /**
   * Multi-Agent 쿼리 실행
   */
  @Post('query')
  @ApiOperation({
    summary: 'Multi-Agent 쿼리 실행',
    description: '여러 전문 에이전트가 협업하여 질문에 답변합니다. SQL, 분석, 차트 추천이 자동으로 수행됩니다.',
  })
  @ApiBody({
    type: MultiAgentQueryDto,
    examples: {
      매출분석: {
        value: { query: '이번 달 매출 TOP 10 상품을 분석해줘' },
      },
      트렌드분석: {
        value: { query: '지난 7일간 일별 매출 추이를 보여줘' },
      },
      비교분석: {
        value: { query: '이번 달과 지난 달 매출을 비교해줘' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Multi-Agent 응답',
  })
  async executeQuery(@Body() dto: MultiAgentQueryDto): Promise<MultiAgentResponse> {
    this.logger.log(`Multi-Agent query: ${dto.query}`);

    const response = await this.multiAgentService.executeQuery(dto.query);

    this.logger.log(
      `Response: ${response.meta.responseType}, agents: ${response.meta.agentsUsed.join(', ')}, time: ${response.meta.processingTime}ms`,
    );

    return response;
  }
}
