import { BedrockChat } from '@langchain/community/chat_models/bedrock';

export interface BedrockChatConfig {
  modelId?: string;
  region?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Bedrock Chat 모델 생성
 * @param config - 모델 설정
 * @returns BedrockChat 인스턴스
 */
export const createBedrockChatModel = (config: BedrockChatConfig = {}): BedrockChat => {
  const {
    modelId = 'anthropic.claude-3-sonnet-20240229-v1:0',
    region = process.env.AWS_REGION || 'us-east-1',
    temperature = 0,
    maxTokens = 4096,
  } = config;

  return new BedrockChat({
    model: modelId,
    region,
    temperature,
    maxTokens,
    // AWS credentials는 환경 변수 또는 IAM Role에서 자동으로 로드됨
  });
};
