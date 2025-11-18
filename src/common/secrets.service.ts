import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class SecretsService implements OnModuleInit {
  private readonly logger = new Logger(SecretsService.name);
  private client: SecretsManagerClient;
  private secrets: Record<string, string> = {};

  constructor() {
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'production') {
      this.logger.log('Loading secrets from AWS Secrets Manager...');
      try {
        await this.loadSecrets();
        this.logger.log('Secrets loaded successfully');
      } catch (error) {
        this.logger.error('Failed to load secrets from AWS Secrets Manager', error);
        throw error;
      }
    } else {
      this.logger.log('Development mode: Using environment variables from .env');
    }
  }

  private async loadSecrets(): Promise<void> {
    const command = new GetSecretValueCommand({
      SecretId: 'ndmarket/database/credentials',
    });

    const response = await this.client.send(command);
    this.secrets = JSON.parse(response.SecretString || '{}');
  }

  get(key: string): string {
    // 프로덕션에서는 Secrets Manager에서, 개발에서는 환경 변수에서 가져옴
    if (process.env.NODE_ENV === 'production' && this.secrets[key]) {
      return this.secrets[key];
    }
    return process.env[key] || '';
  }
}
