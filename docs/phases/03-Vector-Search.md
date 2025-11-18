# Phase 3: Vector Search

## 📋 작업 정의 및 목표 (What & Why)

### What
Amazon Titan Embeddings와 OpenSearch Serverless를 사용하여 상품, 옵션, 매장 데이터에 대한 의미 기반 검색(Semantic Search) 시스템을 구축합니다.

### Why
- SQL로 표현하기 어려운 자연어 질의 처리 ("여름용 시원한 소재의 남성 셔츠")
- 키워드 매칭을 넘어 의미 기반 검색으로 정확도 향상
- 상품 추천 및 유사 매장 찾기 기능 제공
- 다국어 검색 지원 (한국어, 영어)

### 달성 결과
- 텍스트 데이터의 벡터 임베딩 파이프라인 구축
- OpenSearch Serverless에 벡터 인덱스 생성
- 의미 기반 검색 Agent 구현
- Text-to-SQL과 Vector Search 하이브리드 검색

---

## 🔧 기술 스펙 및 제약사항

### 사용 기술 스택
- **Embeddings**: Amazon Titan Embeddings G1 (`amazon.titan-embed-text-v1`)
- **Vector DB**: Amazon OpenSearch Serverless
- **AWS SDK**: @aws-sdk/client-bedrock-runtime, @opensearch-project/opensearch
- **Embedding Dimension**: 1536 (Titan Embeddings)
- **Distance Metric**: Cosine similarity

### AWS 서비스
- Bedrock Runtime (Titan Embeddings)
- OpenSearch Serverless (Vector engine)
- IAM Roles (OpenSearch 접근 권한)

### 제약사항
- OpenSearch Serverless는 특정 리전에서만 사용 가능
- 벡터 인덱스 생성 시간: 대량 데이터의 경우 수 분 소요
- 임베딩 배치 크기: 한 번에 최대 25개 텍스트
- OpenSearch Serverless Cold Start: 첫 쿼리 시 1-2초 지연

---

## 📝 Task 목록

### Task 3.1: Amazon Titan Embeddings 연동

#### What & Why
Bedrock을 통해 Titan Embeddings 모델에 접근하여 텍스트를 벡터로 변환하는 서비스를 구축합니다.

#### Tech Spec
- Model: `amazon.titan-embed-text-v1`
- Embedding dimension: 1536
- Max input length: 8192 tokens
- Batch processing support

#### How

1. `src/common/embeddings.service.ts` 생성:
```typescript
import { Injectable } from '@nestjs/common';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

@Injectable()
export class EmbeddingsService {
  private client: BedrockRuntimeClient;
  private modelId = 'amazon.titan-embed-text-v1';

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  async embedText(text: string): Promise<number[]> {
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
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Process in batches of 25
    const batchSize = 25;
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await Promise.all(
        batch.map((text) => this.embedText(text)),
      );
      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  async getSimilarity(embedding1: number[], embedding2: number[]): Promise<number> {
    // Cosine similarity
    const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));

    return dotProduct / (magnitude1 * magnitude2);
  }
}
```

2. 환경 변수 추가:
```env
AWS_REGION=us-east-1
TITAN_EMBEDDING_MODEL=amazon.titan-embed-text-v1
```

#### Acceptance Criteria
- [ ] 텍스트를 1536차원 벡터로 변환 성공
- [ ] 배치 처리 (25개씩) 작동
- [ ] Cosine similarity 계산 정확
- [ ] API 호출 에러 처리 구현

---

### Task 3.2: OpenSearch Serverless 설정

#### What & Why
OpenSearch Serverless Collection을 생성하고 벡터 검색을 위한 인덱스를 설정합니다.

#### Tech Spec
- Collection type: Vector engine
- Index mapping: k-NN 벡터 필드
- OpenSearch version: 2.x compatible
- Client: @opensearch-project/opensearch

#### How

1. OpenSearch Serverless Collection 생성 (AWS Console 또는 Terraform):
```yaml
# Phase 5에서 Terraform으로 자동화 예정
Collection Name: ndmarket-vectors
Type: vectorsearch
Network Access: Public (개발) / VPC (프로덕션)
Encryption: AWS-managed key
```

2. `src/config/opensearch.config.ts` 생성:
```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('opensearch', () => ({
  node: process.env.OPENSEARCH_ENDPOINT,
  auth: {
    username: process.env.OPENSEARCH_USERNAME,
    password: process.env.OPENSEARCH_PASSWORD,
  },
}));
```

3. `src/common/opensearch.service.ts` 생성:
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';

@Injectable()
export class OpenSearchService implements OnModuleInit {
  private client: Client;

  constructor(private configService: ConfigService) {
    const config = this.configService.get('opensearch');
    this.client = new Client({
      node: config.node,
      auth: config.auth,
    });
  }

  async onModuleInit() {
    await this.createIndexIfNotExists();
  }

  private async createIndexIfNotExists() {
    const indexName = 'products';

    const exists = await this.client.indices.exists({ index: indexName });

    if (!exists.body) {
      await this.client.indices.create({
        index: indexName,
        body: {
          settings: {
            index: {
              knn: true,
              'knn.algo_param.ef_search': 512,
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
                dimension: 1536,
                method: {
                  name: 'hnsw',
                  space_type: 'cosinesimil',
                  engine: 'nmslib',
                  parameters: {
                    ef_construction: 512,
                    m: 16,
                  },
                },
              },
            },
          },
        },
      });
    }
  }

  getClient(): Client {
    return this.client;
  }
}
```

#### Acceptance Criteria
- [ ] OpenSearch Serverless Collection 생성 완료
- [ ] k-NN 인덱스 생성 성공
- [ ] OpenSearch 클라이언트 연결 성공
- [ ] 인덱스 매핑이 올바르게 설정됨

---

### Task 3.3: 데이터 벡터화 및 인덱싱 파이프라인

#### What & Why
MySQL의 상품/옵션/매장 데이터를 읽어 임베딩으로 변환하고 OpenSearch에 저장하는 파이프라인을 구축합니다.

#### Tech Spec
- 배치 처리: 100개씩
- 데이터 소스: MySQL (product, market 테이블)
- 스케줄링: NestJS Cron (선택적)

#### How

1. `src/modules/indexing/indexing.service.ts` 생성:
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmbeddingsService } from '@/common/embeddings.service';
import { OpenSearchService } from '@/common/opensearch.service';
import { Product } from '@/database/entities/product.entity';

@Injectable()
export class IndexingService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private embeddingsService: EmbeddingsService,
    private openSearchService: OpenSearchService,
  ) {}

  async indexAllProducts(): Promise<{ indexed: number; failed: number }> {
    const batchSize = 100;
    let offset = 0;
    let indexed = 0;
    let failed = 0;

    while (true) {
      const products = await this.productRepository.find({
        take: batchSize,
        skip: offset,
        relations: ['market'],
      });

      if (products.length === 0) break;

      try {
        await this.indexProductBatch(products);
        indexed += products.length;
      } catch (error) {
        console.error('Batch indexing failed:', error);
        failed += products.length;
      }

      offset += batchSize;
    }

    return { indexed, failed };
  }

  private async indexProductBatch(products: Product[]): Promise<void> {
    // Create text representations
    const texts = products.map((p) => this.createProductText(p));

    // Generate embeddings
    const embeddings = await this.embeddingsService.embedBatch(texts);

    // Bulk index to OpenSearch
    const body = products.flatMap((product, index) => [
      { index: { _index: 'products', _id: product.id.toString() } },
      {
        product_id: product.id,
        name: product.name,
        description: product.description || '',
        category: product.category,
        market_name: product.market?.name || '',
        embedding: embeddings[index],
      },
    ]);

    const client = this.openSearchService.getClient();
    await client.bulk({ body });
  }

  private createProductText(product: Product): string {
    return `${product.name} ${product.description || ''} ${product.category} ${product.market?.name || ''}`;
  }
}
```

2. 인덱싱 Controller 추가:
```typescript
import { Controller, Post } from '@nestjs/common';
import { IndexingService } from './indexing.service';

@Controller('indexing')
export class IndexingController {
  constructor(private readonly indexingService: IndexingService) {}

  @Post('products')
  async indexProducts() {
    const result = await this.indexingService.indexAllProducts();
    return {
      message: 'Indexing completed',
      ...result,
    };
  }
}
```

#### Acceptance Criteria
- [ ] 모든 상품 데이터 임베딩 변환 성공
- [ ] OpenSearch에 벡터 인덱싱 완료
- [ ] 배치 처리로 메모리 효율적 처리
- [ ] POST `/indexing/products` 엔드포인트 작동
- [ ] 인덱싱 진행 상황 로깅

---

### Task 3.4: 의미 기반 검색 구현

#### What & Why
자연어 질의를 임베딩으로 변환하고 OpenSearch k-NN 검색으로 유사한 상품을 찾습니다.

#### Tech Spec
- k-NN search
- Top-K results (default: 10)
- Similarity threshold: 0.7
- Hybrid search (optional): Vector + keyword

#### How

1. `src/modules/search/search.service.ts` 생성:
```typescript
import { Injectable } from '@nestjs/common';
import { EmbeddingsService } from '@/common/embeddings.service';
import { OpenSearchService } from '@/common/opensearch.service';

interface SearchResult {
  productId: number;
  name: string;
  description: string;
  category: string;
  marketName: string;
  score: number;
}

@Injectable()
export class SearchService {
  constructor(
    private embeddingsService: EmbeddingsService,
    private openSearchService: OpenSearchService,
  ) {}

  async semanticSearch(query: string, topK = 10): Promise<SearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await this.embeddingsService.embedText(query);

    // k-NN search
    const client = this.openSearchService.getClient();
    const response = await client.search({
      index: 'products',
      body: {
        size: topK,
        query: {
          knn: {
            embedding: {
              vector: queryEmbedding,
              k: topK,
            },
          },
        },
      },
    });

    return response.body.hits.hits.map((hit: any) => ({
      productId: hit._source.product_id,
      name: hit._source.name,
      description: hit._source.description,
      category: hit._source.category,
      marketName: hit._source.market_name,
      score: hit._score,
    }));
  }

  async hybridSearch(query: string, topK = 10): Promise<SearchResult[]> {
    // Hybrid: Vector search + keyword search
    const queryEmbedding = await this.embeddingsService.embedText(query);

    const client = this.openSearchService.getClient();
    const response = await client.search({
      index: 'products',
      body: {
        size: topK,
        query: {
          bool: {
            should: [
              {
                knn: {
                  embedding: {
                    vector: queryEmbedding,
                    k: topK * 2,
                  },
                },
              },
              {
                multi_match: {
                  query,
                  fields: ['name^3', 'description', 'category^2'],
                },
              },
            ],
          },
        },
      },
    });

    return response.body.hits.hits.map((hit: any) => ({
      productId: hit._source.product_id,
      name: hit._source.name,
      description: hit._source.description,
      category: hit._source.category,
      marketName: hit._source.market_name,
      score: hit._score,
    }));
  }
}
```

2. Search Controller:
```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('semantic')
  async semanticSearch(@Query('q') query: string, @Query('k') topK = 10) {
    return this.searchService.semanticSearch(query, topK);
  }

  @Get('hybrid')
  async hybridSearch(@Query('q') query: string, @Query('k') topK = 10) {
    return this.searchService.hybridSearch(query, topK);
  }
}
```

#### Acceptance Criteria
- [ ] 자연어 질의로 유사 상품 검색 성공
- [ ] k-NN 검색 결과 정확도 70% 이상
- [ ] Hybrid search 작동 (벡터 + 키워드)
- [ ] GET `/search/semantic?q=여름용 시원한 셔츠` 작동
- [ ] 응답 시간 <1초

---

### Task 3.5: Semantic Search Agent 통합

#### What & Why
LangGraph 워크플로우에 Semantic Search Agent를 추가하여 SQL과 Vector Search를 조합합니다.

#### Tech Spec
- LangChain Tool: SemanticSearchTool
- Router Agent: SQL vs Vector Search 판단
- Hybrid results: SQL + Vector 결과 병합

#### How

1. `src/agents/tools/semantic-search.tool.ts` 생성:
```typescript
import { Tool } from 'langchain/tools';
import { SearchService } from '@/modules/search/search.service';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().describe('Natural language search query'),
  topK: z.number().default(10).describe('Number of results to return'),
});

export class SemanticSearchTool extends Tool {
  name = 'semantic_search';
  description = `Search for products using natural language semantic search.
    Use this when the user asks about product features, descriptions, or attributes
    that are not easily queryable with SQL.
    Examples: "여름용 시원한 소재", "남성 캐주얼 셔츠"`;

  schema = searchSchema;

  constructor(private searchService: SearchService) {
    super();
  }

  async _call(input: string): Promise<string> {
    try {
      const { query, topK } = searchSchema.parse(JSON.parse(input));
      const results = await this.searchService.semanticSearch(query, topK);

      return JSON.stringify({
        success: true,
        count: results.length,
        results,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error.message,
      });
    }
  }
}
```

2. QueryWorkflow에 Semantic Search 추가:
```typescript
// src/agents/workflow/query-workflow.ts
private async routeQuery(state: AgentState): Promise<Partial<AgentState>> {
  const query = state.userQuery.toLowerCase();

  let queryType: AgentState['queryType'] = 'simple_query';

  // Check if semantic search is more appropriate
  const semanticKeywords = ['같은', '유사한', '비슷한', '추천', '찾아줘'];
  const isSemanticQuery = semanticKeywords.some((kw) => query.includes(kw));

  if (isSemanticQuery) {
    queryType = 'semantic_search';
  } else if (query.includes('분석') || query.includes('비교')) {
    queryType = 'analysis';
  }

  return {
    currentStep: queryType === 'semantic_search' ? 'semantic_search' : 'sql_generation',
    queryType,
  };
}
```

#### Acceptance Criteria
- [ ] SemanticSearchTool이 LangChain Tool로 작동
- [ ] Router Agent가 SQL vs Vector Search 선택
- [ ] 의미 검색 질의 자동 감지
- [ ] 워크플로우에 Vector Search 경로 추가
- [ ] Hybrid 질의 (SQL + Vector) 처리 가능

---

## ✅ Phase 완료 기준

- [ ] Amazon Titan Embeddings 연동 완료
- [ ] OpenSearch Serverless Collection 및 인덱스 생성
- [ ] 상품 데이터 벡터화 및 인덱싱 완료
- [ ] k-NN 의미 기반 검색 작동 (정확도 70% 이상)
- [ ] Hybrid search (벡터 + 키워드) 구현
- [ ] GET `/search/semantic` 및 `/search/hybrid` 엔드포인트 완성
- [ ] SemanticSearchTool이 LangGraph 워크플로우에 통합
- [ ] Router Agent가 SQL vs Vector Search 자동 선택
- [ ] 검색 응답 시간 <1초
- [ ] 배치 인덱싱 파이프라인 작동

## 🚀 다음 단계

Phase 3 완료 후 [Phase 4: Dashboard](./04-Dashboard.md)로 진행하여 관리자 대시보드를 구축합니다.
