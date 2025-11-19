import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

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

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log('\n' + '='.repeat(60));
  console.log(`🚀 Backend API is running on: http://localhost:${port}`);
  console.log(`📊 Dashboard is running on: http://localhost:5173`);
  console.log(`📚 API Documentation: http://localhost:${port}/api`);
  console.log('='.repeat(60) + '\n');
}

bootstrap();
