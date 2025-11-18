import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentsModule } from './agents/agents.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BedrockService } from './common/bedrock.service';
import { EmbeddingsService } from './common/embeddings.service';
import { OpenSearchService } from './common/opensearch.service';
import { SecretsModule } from './common/secrets.module';
import { SecretsService } from './common/secrets.service';
import opensearchConfig from './config/opensearch.config';
import { IndexingModule } from './modules/indexing/indexing.module';
import { QueryModule } from './modules/query/query.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [opensearchConfig],
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
    IndexingModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService, BedrockService, EmbeddingsService, OpenSearchService],
  exports: [BedrockService, EmbeddingsService, OpenSearchService],
})
export class AppModule {}
