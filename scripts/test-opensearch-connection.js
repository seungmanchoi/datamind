#!/usr/bin/env node
/**
 * OpenSearch 연결 테스트 스크립트
 */
const fs = require('fs');
const path = require('path');

// .env 파일 수동 로드
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

const { Client } = require('@opensearch-project/opensearch');
const { fromNodeProviderChain } = require('@aws-sdk/credential-providers');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');

async function testConnection() {
  try {
    console.log('\n=== OpenSearch Connection Test ===');

    const region = process.env.AWS_REGION || 'ap-northeast-2';
    const endpoint = process.env.OPENSEARCH_ENDPOINT;

    console.log('Endpoint:', endpoint);
    console.log('Region:', region);

    const credentialsProvider = fromNodeProviderChain();
    const credentials = await credentialsProvider();

    console.log('\n=== AWS Credentials ===');
    console.log('Access Key ID:', credentials.accessKeyId);
    console.log('Secret Access Key:', credentials.secretAccessKey?.substring(0, 10) + '...');

    const client = new Client({
      ...AwsSigv4Signer({
        region,
        service: 'es',
        getCredentials: () => {
          const provider = fromNodeProviderChain();
          return provider();
        },
      }),
      node: endpoint,
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });

    console.log('\n=== Testing OpenSearch Connection ===');

    // 클러스터 정보 조회
    const info = await client.info();
    console.log('✅ Connection successful!');
    console.log('Cluster name:', info.body.cluster_name);
    console.log('Version:', info.body.version.number);

    // 인덱스 존재 여부 확인
    console.log('\n=== Testing Index Operations ===');
    const exists = await client.indices.exists({ index: 'products' });
    console.log('Products index exists:', exists.body);

    console.log('\n✅ All tests passed!\n');

  } catch (error) {
    console.error('\n❌ Connection test failed');
    console.error('Error:', error.message);

    if (error.meta) {
      console.error('Status code:', error.meta.statusCode);
      console.error('Response body:', error.meta.body);
    }

    process.exit(1);
  }
}

testConnection();
