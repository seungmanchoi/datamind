#!/usr/bin/env node
/**
 * AWS 자격 증명 확인 스크립트
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

const { fromNodeProviderChain } = require('@aws-sdk/credential-providers');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

async function checkCredentials() {
  try {
    const credentialsProvider = fromNodeProviderChain();
    const credentials = await credentialsProvider();

    console.log('\n=== AWS Credentials Info ===');
    console.log('Access Key ID:', credentials.accessKeyId);
    console.log('Secret Access Key:', credentials.secretAccessKey?.substring(0, 10) + '...');

    const stsClient = new STSClient({
      region: process.env.AWS_REGION || 'ap-northeast-2',
      credentials: credentialsProvider
    });

    const command = new GetCallerIdentityCommand({});
    const response = await stsClient.send(command);

    console.log('\n=== Caller Identity ===');
    console.log('UserId:', response.UserId);
    console.log('Account:', response.Account);
    console.log('Arn:', response.Arn);
    console.log('\n✅ AWS 자격 증명 확인 완료\n');

    return response.Arn;
  } catch (error) {
    console.error('\n❌ AWS 자격 증명 확인 실패:', error.message);
    process.exit(1);
  }
}

checkCredentials();
