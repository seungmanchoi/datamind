# AWS OpenSearch 설정 가이드

NestJS 애플리케이션에서 AWS OpenSearch Service를 IAM 인증으로 연동하는 완전한 가이드

## 목차

1. [AWS OpenSearch 도메인 생성](#1-aws-opensearch-도메인-생성)
2. [IAM 사용자 및 권한 설정](#2-iam-사용자-및-권한-설정)
3. [Fine-grained Access Control 설정](#3-fine-grained-access-control-설정)
4. [도메인 액세스 정책 설정](#4-도메인-액세스-정책-설정)
5. [NestJS 코드 구성](#5-nestjs-코드-구성)
6. [환경 변수 설정](#6-환경-변수-설정)
7. [테스트 및 검증](#7-테스트-및-검증)
8. [트러블슈팅](#8-트러블슈팅)

---

## 1. AWS OpenSearch 도메인 생성

### 1.1 기본 설정

AWS Console → Amazon OpenSearch Service → Create domain

**도메인 이름**: `opensearch-datamind`

**배포 옵션**:
- 배포 유형: **도메인**
- 가용 영역: **3-AZ** (프로덕션 권장)

**엔진 옵션**:
- OpenSearch 버전: **3.1.0** (최신 버전)
- 엔진: OpenSearch

### 1.2 컴퓨팅 및 스토리지

**데이터 노드**:
- 인스턴스 유형: `t3.small.search` (개발) / `r6g.large.search` (프로덕션)
- 노드 수: 3 (3-AZ 구성)

**스토리지**:
- EBS 스토리지 크기: 10GB (개발) / 100GB+ (프로덕션)
- EBS 볼륨 유형: gp3

### 1.3 네트워크

**네트워크 구성**:
- 퍼블릭 액세스 (개발용) / VPC 액세스 (프로덕션)
- IPv4 또는 듀얼 스택

### 1.4 보안 구성 (중요!)

**Fine-grained access control**:
- ✅ **활성화** 필수
- 마스터 사용자: **IAM ARN** 선택
- IAM ARN: `arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_USERNAME`

⚠️ **주의**: 마스터 사용자를 반드시 **IAM ARN**으로 설정해야 합니다. "내부 사용자 데이터베이스"를 선택하면 IAM 인증이 제대로 작동하지 않습니다.

**암호화**:
- 저장 데이터 암호화: 활성화
- 노드 간 암호화: 활성화
- TLS 1.2 이상

---

## 2. IAM 사용자 및 권한 설정

### 2.1 IAM 사용자 생성

AWS Console → IAM → Users → Create user

**사용자 이름**: `felix` (또는 원하는 이름)

**액세스 유형**:
- ✅ Programmatic access (Access Key 생성)

### 2.2 필요한 IAM 정책 연결

다음 AWS 관리형 정책을 사용자에게 연결:

1. **AmazonOpenSearchServiceFullAccess**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "es:*",
         "Resource": "*"
       }
     ]
   }
   ```

2. **(옵션) AdministratorAccess** - 개발 환경용

### 2.3 Access Key 생성 및 저장

1. IAM 사용자 상세 페이지 → Security credentials 탭
2. **Create access key** 클릭
3. Use case: **Application running outside AWS** 선택
4. **Access Key ID**와 **Secret Access Key** 안전하게 저장

⚠️ Secret Access Key는 생성 시에만 확인 가능하므로 반드시 저장하세요!

---

## 3. Fine-grained Access Control 설정

### 3.1 OpenSearch Dashboards 접속

도메인이 활성화되면 OpenSearch Dashboards URL 접속:
```
https://search-opensearch-datamind-XXXXXX.ap-northeast-2.es.amazonaws.com/_dashboards
```

**로그인**:
- 내부 사용자 데이터베이스 계정으로 로그인 (처음 설정 시)
- 또는 AWS Console에서 "마스터 사용자 편집"으로 암호 설정

### 3.2 Role Mapping 설정

OpenSearch Dashboards → 왼쪽 메뉴 (☰) → **Security** → **Roles**

#### all_access 역할 매핑

1. **all_access** 역할 선택
2. **Mapped users** 탭 선택
3. **Manage mapping** 클릭

**Backend roles 추가**:
```
arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_USERNAME
```

예시:
```
arn:aws:iam::700526301145:user/felix
```

4. **Map** 버튼 클릭

⚠️ **중요**:
- **Backend roles** 섹션에만 IAM ARN 추가
- **Users** 섹션은 비워두거나 내부 사용자만 추가

#### security_manager 역할 매핑 (선택사항)

동일한 방법으로 `security_manager` 역할에도 IAM ARN 매핑

### 3.3 검증

Dev Tools에서 확인:
```json
GET _plugins/_security/api/rolesmapping/all_access
```

**예상 결과**:
```json
{
  "all_access": {
    "users": [],
    "backend_roles": [
      "arn:aws:iam::700526301145:user/felix"
    ]
  }
}
```

---

## 4. 도메인 액세스 정책 설정

AWS Console → OpenSearch Service → 도메인 선택 → **작업** → **보안 구성 편집**

**도메인 수준 액세스 정책 구성** 선택:

### 개발 환경 (모든 접근 허용)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:ap-northeast-2:YOUR_ACCOUNT_ID:domain/opensearch-datamind/*"
    }
  ]
}
```

### 프로덕션 환경 (특정 IAM 사용자만 허용)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:user/YOUR_USERNAME"
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:ap-northeast-2:YOUR_ACCOUNT_ID:domain/opensearch-datamind/*"
    }
  ]
}
```

**변경사항 저장** 후 도메인이 "Active" 상태가 될 때까지 대기 (5-10분)

---

## 5. NestJS 코드 구성

### 5.1 필요한 패키지 설치

```bash
pnpm add @opensearch-project/opensearch @aws-sdk/credential-providers aws4
```

### 5.2 OpenSearch Service 구현

`src/common/opensearch.service.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';

@Injectable()
export class OpenSearchService implements OnModuleInit {
  private readonly logger = new Logger(OpenSearchService.name);
  private client: Client;

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.initializeClient();
      await this.createIndexIfNotExists();
      this.logger.log('OpenSearch initialization completed');
    } catch (error) {
      this.logger.warn(`Failed to initialize OpenSearch: ${error.message}`);
    }
  }

  private async initializeClient(): Promise<void> {
    const config = this.configService.get('opensearch');
    const region = process.env.AWS_REGION || 'ap-northeast-2';

    this.client = new Client({
      ...AwsSigv4Signer({
        region,
        service: 'es', // OpenSearch는 'es' 서비스 이름 사용
        getCredentials: () => {
          const provider = fromNodeProviderChain();
          return provider();
        },
      }),
      node: config.node,
      ssl: config.ssl,
    });

    this.logger.log(`OpenSearch client initialized: ${config.node}`);
  }

  private async createIndexIfNotExists(): Promise<void> {
    const indexName = 'products';

    try {
      const exists = await this.client.indices.exists({ index: indexName });

      if (!exists.body) {
        this.logger.log(`Creating index: ${indexName}`);

        await this.client.indices.create({
          index: indexName,
          body: {
            settings: {
              index: {
                knn: true,
                number_of_shards: 1,
                number_of_replicas: 2, // Zone awareness 3개 AZ 대응
              },
            },
            mappings: {
              properties: {
                product_id: { type: 'keyword' },
                name: { type: 'text' },
                description: { type: 'text' },
                category: { type: 'keyword' },
                market_name: { type: 'text' },
                embedding: {
                  type: 'knn_vector',
                  dimension: 1536, // Titan Embeddings 차원
                  method: {
                    name: 'hnsw',
                    space_type: 'l2',
                    engine: 'lucene', // OpenSearch 3.0+ 호환
                    parameters: {
                      ef_construction: 128,
                      m: 16,
                    },
                  },
                },
              },
            },
          },
        });

        this.logger.log(`Index created: ${indexName}`);
      } else {
        this.logger.log(`Index already exists: ${indexName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create index: ${error.message}`);
      throw error;
    }
  }

  getClient(): Client {
    return this.client;
  }

  async indexExists(indexName: string): Promise<boolean> {
    try {
      const response = await this.client.indices.exists({ index: indexName });
      return response.body;
    } catch (error) {
      this.logger.error(`Failed to check index: ${error.message}`);
      return false;
    }
  }
}
```

### 5.3 설정 파일

`src/config/opensearch.config.ts`:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('opensearch', () => ({
  node: process.env.OPENSEARCH_ENDPOINT,
  ssl: {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
}));
```

### 5.4 모듈 등록

`src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import opensearchConfig from './config/opensearch.config';
import { OpenSearchService } from './common/opensearch.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [opensearchConfig],
    }),
  ],
  providers: [OpenSearchService],
  exports: [OpenSearchService],
})
export class AppModule {}
```

---

## 6. 환경 변수 설정

`.env` 파일:

```bash
# AWS 자격 증명
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=AKIA2GGU7B7MSM5SBDE5
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# OpenSearch 엔드포인트
OPENSEARCH_ENDPOINT=https://search-opensearch-datamind-XXXXXX.ap-northeast-2.es.amazonaws.com

# 환경
NODE_ENV=development
```

⚠️ **보안 주의사항**:
- `.env` 파일을 `.gitignore`에 추가
- 프로덕션에서는 AWS Secrets Manager 사용 권장

---

## 7. 테스트 및 검증

### 7.1 테스트 스크립트 작성

`scripts/test-opensearch-connection.js`:

```javascript
#!/usr/bin/env node
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

    const info = await client.info();
    console.log('✅ Connection successful!');
    console.log('Cluster name:', info.body.cluster_name);
    console.log('Version:', info.body.version.number);

    const exists = await client.indices.exists({ index: 'products' });
    console.log('\n=== Testing Index Operations ===');
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
```

### 7.2 테스트 실행

```bash
# IAM 자격 증명 확인
node scripts/test-aws-creds.js

# OpenSearch 연결 테스트
node scripts/test-opensearch-connection.js

# NestJS 앱 실행
pnpm run start:dev
```

**예상 결과**:
```
✅ Connection successful!
✅ Cluster name: 700526301145:opensearch-datamind
✅ Version: 3.1.0
✅ Products index exists: true
✅ All tests passed!
```

---

## 8. 트러블슈팅

### 8.1 HTTP 403 Forbidden 에러

**증상**:
```
security_exception: no permissions for [cluster:monitor/main]
User [name=arn:aws:iam::ACCOUNT:user/USERNAME, backend_roles=[], requestedTenant=null]
```

**원인**: `backend_roles=[]` - Role Mapping이 적용되지 않음

**해결 방법**:

1. **마스터 사용자 유형 확인**
   - AWS Console → OpenSearch 도메인 → 세부 정보 탭
   - **마스터 사용자 유형**: "IAM ARN"이어야 함
   - "내부 사용자 데이터베이스"로 설정되어 있다면 **변경 필요**

2. **마스터 사용자 변경**
   - **작업** → **보안 구성 편집**
   - 마스터 사용자 → **IAM ARN** 선택
   - IAM ARN: `arn:aws:iam::ACCOUNT_ID:user/USERNAME`
   - 저장 후 5-10분 대기

3. **Role Mapping 재설정**
   - OpenSearch Dashboards → Security → Roles → all_access
   - Mapped users → Backend roles에 IAM ARN 추가

### 8.2 Zone Awareness 에러

**증상**:
```
illegal_argument_exception: expected total copies needs to be a multiple
of total awareness attributes [3]
```

**원인**: 3-AZ 구성에서 `number_of_replicas`가 올바르지 않음

**해결 방법**:

`number_of_replicas`를 **2**로 설정:
- 1 shard + 2 replicas = 3 total copies (3의 배수)

```typescript
settings: {
  index: {
    number_of_shards: 1,
    number_of_replicas: 2, // 3-AZ 대응
  },
}
```

### 8.3 nmslib 엔진 deprecated 에러

**증상**:
```
mapper_parsing_exception: nmslib engine is deprecated in OpenSearch
and cannot be used for new index creation in OpenSearch from 3.0.0.
```

**원인**: OpenSearch 3.0 이상은 `nmslib` 엔진 미지원

**해결 방법**:

`lucene` 엔진 사용:

```typescript
embedding: {
  type: 'knn_vector',
  dimension: 1536,
  method: {
    name: 'hnsw',
    space_type: 'l2',
    engine: 'lucene', // nmslib 대신 lucene 사용
    parameters: {
      ef_construction: 128,
      m: 16,
    },
  },
}
```

### 8.4 OpenSearch Dashboards 접근 불가

**증상**:
```
User: anonymous is not authorized to perform: es:ESHttpGet
```

**원인**: 도메인 액세스 정책이 OpenSearch Dashboards 접근을 차단

**해결 방법**:

도메인 액세스 정책을 모든 접근 허용으로 변경 (개발 환경):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:REGION:ACCOUNT:domain/DOMAIN_NAME/*"
    }
  ]
}
```

### 8.5 자격 증명 확인

IAM 자격 증명이 올바른지 확인:

```bash
# AWS CLI로 확인
aws sts get-caller-identity

# 또는 테스트 스크립트
node scripts/test-aws-creds.js
```

**예상 결과**:
```json
{
  "UserId": "AIDASAMPLEUSERID",
  "Account": "700526301145",
  "Arn": "arn:aws:iam::700526301145:user/felix"
}
```

---

## 9. 주요 설정 체크리스트

OpenSearch 연동 전 반드시 확인:

- [ ] OpenSearch 도메인 생성 완료 (3.1.0 버전)
- [ ] Fine-grained access control **활성화**
- [ ] 마스터 사용자 유형: **IAM ARN** (내부 사용자 DB 아님!)
- [ ] IAM 사용자 생성 및 Access Key 발급
- [ ] IAM 정책: AmazonOpenSearchServiceFullAccess 연결
- [ ] 도메인 액세스 정책: IAM 사용자 허용
- [ ] Role Mapping: all_access에 IAM ARN 추가 (Backend roles)
- [ ] `number_of_replicas`: 2 (3-AZ 대응)
- [ ] KNN 엔진: `lucene` (nmslib 아님!)
- [ ] 환경 변수 설정 완료 (.env)
- [ ] 테스트 스크립트 실행 성공

---

## 10. 참고 자료

- [AWS OpenSearch Service 문서](https://docs.aws.amazon.com/opensearch-service/)
- [Fine-grained access control](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html)
- [IAM과 OpenSearch 통합](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/security-iam.html)
- [OpenSearch k-NN 플러그인](https://opensearch.org/docs/latest/search-plugins/knn/index/)
- [@opensearch-project/opensearch](https://github.com/opensearch-project/opensearch-js)

---

## 문서 업데이트 이력

- 2025-11-24: 초기 문서 작성 (OpenSearch 3.1.0, IAM 인증, 트러블슈팅 포함)
