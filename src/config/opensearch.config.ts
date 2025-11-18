import { registerAs } from '@nestjs/config';

/**
 * OpenSearch Serverless Configuration
 * OpenSearch Serverless 연결 설정
 */
export default registerAs('opensearch', () => ({
  node: process.env.OPENSEARCH_ENDPOINT || 'https://localhost:9200',
  auth: {
    username: process.env.OPENSEARCH_USERNAME || 'admin',
    password: process.env.OPENSEARCH_PASSWORD || 'admin',
  },
  ssl: {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
}));
