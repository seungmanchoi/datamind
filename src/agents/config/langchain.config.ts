import { ChatBedrockConverse } from '@langchain/aws';

export interface BedrockChatConfig {
  modelId?: string;
  region?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Bedrock Chat 모델 생성 (ChatBedrockConverse 사용)
 * AWS Bedrock Inference Profile 지원
 * @param config - 모델 설정
 * @returns ChatBedrockConverse 인스턴스
 */
export const createBedrockChatModel = (config: BedrockChatConfig = {}): ChatBedrockConverse => {
  const {
    // Claude Sonnet 4.5 (최신, SQL 생성 및 인사이트 분석에 최적)
    modelId = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    region = process.env.BEDROCK_REGION || 'us-east-1',
    temperature = 0,
    maxTokens = 4096,
  } = config;

  return new ChatBedrockConverse({
    model: modelId,
    region,
    temperature,
    maxTokens,
    // 재시도 설정 (Rate limiting 대응)
    maxRetries: 3,
    // AWS credentials는 환경 변수 또는 IAM Role에서 자동으로 로드됨
  });
};

/**
 * Multi-Agent용 경량 모델 생성 (더 빠른 응답)
 * Claude Haiku 4.5 사용으로 속도와 품질 모두 향상
 *
 * 사용 가능한 Haiku 모델 ID:
 * - Claude 3 Haiku: anthropic.claude-3-haiku-20240307-v1:0 (레거시)
 * - Claude 3.5 Haiku: us.anthropic.claude-3-5-haiku-20241022-v1:0
 * - Claude Haiku 4.5: us.anthropic.claude-haiku-4-5-20251001-v1:0 (최신, 권장)
 */
export const createBedrockFastModel = (config: BedrockChatConfig = {}): ChatBedrockConverse => {
  const {
    // Claude Haiku 4.5 (최신, 차트/후속질문에 최적)
    modelId = process.env.BEDROCK_FAST_MODEL_ID || 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
    region = process.env.BEDROCK_REGION || 'us-east-1',
    temperature = 0,
    maxTokens = 2048,
  } = config;

  return new ChatBedrockConverse({
    model: modelId,
    region,
    temperature,
    maxTokens,
    maxRetries: 3,
  });
};
