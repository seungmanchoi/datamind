import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Amazon Titan Embeddings Service
 * 텍스트를 1536차원 벡터로 변환하는 서비스
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private client: BedrockRuntimeClient;
  private modelId = 'amazon.titan-embed-text-v1';

  constructor() {
    const region = process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1';
    this.client = new BedrockRuntimeClient({
      region,
    });

    this.logger.log(`Initialized Titan Embeddings (region: ${region}, model: ${this.modelId})`);
  }

  /**
   * 단일 텍스트를 벡터로 변환
   * @param text - 임베딩할 텍스트
   * @returns 1536차원 벡터 배열
   */
  async embedText(text: string): Promise<number[]> {
    try {
      const payload = {
        inputText: text,
      };

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return responseBody.embedding;
    } catch (error) {
      this.logger.error(`Failed to embed text: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 여러 텍스트를 배치로 임베딩
   * @param texts - 임베딩할 텍스트 배열
   * @returns 벡터 배열
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    // Process in batches of 25 (Titan Embeddings limit)
    const batchSize = 25;
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      this.logger.log(`Processing batch ${i / batchSize + 1} (${batch.length} texts)`);

      try {
        const batchEmbeddings = await Promise.all(batch.map((text) => this.embedText(text)));
        embeddings.push(...batchEmbeddings);
      } catch (error) {
        this.logger.error(`Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }

    return embeddings;
  }

  /**
   * 두 벡터 간의 코사인 유사도 계산
   * @param embedding1 - 첫 번째 벡터
   * @param embedding2 - 두 번째 벡터
   * @returns 코사인 유사도 (0~1)
   */
  getSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embedding dimensions do not match');
    }

    // Cosine similarity
    const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }
}
