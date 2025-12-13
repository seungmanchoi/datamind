import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

import { AgentsModule } from '@/agents/agents.module';
import { MultiAgentModule } from '@/agents/multi-agent/multi-agent.module';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { BedrockService } from '@/common/bedrock.service';
import { EmbeddingsService } from '@/common/embeddings.service';
import { OpenSearchService } from '@/common/opensearch.service';
import { SecretsModule } from '@/common/secrets.module';
import { SecretsService } from '@/common/secrets.service';
import opensearchConfig from '@/config/opensearch.config';
import { ExportModule } from '@/modules/export/export.module';
import { IndexingModule } from '@/modules/indexing/indexing.module';
import { QueryLearningModule } from '@/modules/query-learning/query-learning.module';
import { QueryModule } from '@/modules/query/query.module';
import { SearchModule } from '@/modules/search/search.module';
import { RagModule } from '@/rag/rag.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [opensearchConfig],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
      exclude: ['/api*', '/agent*', '/multi-agent*', '/search*', '/indexing*', '/export*', '/query-learning*'],
    }),
    SecretsModule,
    TypeOrmModule.forRootAsync({
      inject: [SecretsService],
      useFactory: (secretsService: SecretsService) => ({
        type: 'mysql' as const,
        host: secretsService.get('DATABASE_HOST'),
        port: parseInt(secretsService.get('DATABASE_PORT'), 10) || 3306,
        username: secretsService.get('DATABASE_USER'),
        password: secretsService.get('DATABASE_PASSWORD'),
        database: secretsService.get('DATABASE_NAME'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV === 'development',
        // 프로덕션에서만 SSL 활성화
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
        extra: {
          connectionLimit: 10,
        },
      }),
    }),
    QueryModule,
    AgentsModule,
    MultiAgentModule,
    IndexingModule,
    SearchModule,
    ExportModule,
    RagModule,
    QueryLearningModule,
  ],
  controllers: [AppController],
  providers: [AppService, BedrockService, EmbeddingsService, OpenSearchService],
  exports: [BedrockService, EmbeddingsService, OpenSearchService],
})
export class AppModule {}
