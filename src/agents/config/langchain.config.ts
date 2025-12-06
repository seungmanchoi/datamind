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
    // Cross-region inference profile ID 사용 (us. prefix)
    modelId = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    region = process.env.AWS_REGION || 'us-east-1',
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
 * Haiku 모델 사용으로 속도 향상
 */
export const createBedrockFastModel = (config: BedrockChatConfig = {}): ChatBedrockConverse => {
  const {
    // Haiku 모델 사용 (더 빠르고 저렴)
    modelId = process.env.BEDROCK_FAST_MODEL_ID || 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    region = process.env.AWS_REGION || 'us-east-1',
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
