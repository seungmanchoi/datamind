import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from '@/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS 설정
  app.enableCors();

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('NDMarket AI Insight Platform API')
    .setDescription(
      `
## Overview
NDMarket AI Insight Platform의 백엔드 API 문서입니다.

### 주요 기능
- **AI 질의**: 자연어로 데이터베이스 질의
- **임베딩 관리**: 텍스트 및 Few-shot 예제 임베딩
- **시맨틱 검색**: 벡터 기반 유사도 검색

### 기술 스택
- Amazon Bedrock (Claude 3, Titan Embeddings)
- OpenSearch Serverless
- GCP Cloud SQL (MySQL)
    `,
    )
    .setVersion('1.0')
    .addTag('Query', 'AI 자연어 질의 API')
    .addTag('Search', '시맨틱/하이브리드 검색 API')
    .addTag('Indexing', '데이터 인덱싱 및 임베딩 API')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'NDMarket AI API Docs',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 30px 0 }
    `,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const isDev = process.env.NODE_ENV !== 'production';

  console.log('\n' + '='.repeat(60));
  console.log(`🚀 Backend API: http://localhost:${port}`);

  if (isDev) {
    console.log(`📊 Frontend (Dev): http://localhost:5173`);
    console.log(`   Frontend (Prod build): http://localhost:${port}`);
  } else {
    console.log(`📊 Frontend: http://localhost:${port}`);
  }

  console.log(`📚 API Documentation: http://localhost:${port}/api`);
  console.log('='.repeat(60) + '\n');
}

bootstrap();
