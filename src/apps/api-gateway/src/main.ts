import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from '../../../packages/auth/src/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true })
  );

  await app.register(require('@fastify/cors'), {
    origin: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger/OpenAPI setup
  const { swaggerConfig } = await import('./openapi.config');
  const config = swaggerConfig;

  const document = SwaggerModule.createDocument(app, config);
  await app.register(require('@fastify/swagger'), {
    swagger: document,
  });
  await app.register(require('@fastify/swagger-ui'), {
    routePrefix: '/api',
    uiConfig: {
      persistAuthorization: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API Gateway (Fastify) running on port ${port}`);
  console.log(`📖 REST API Documentation: http://localhost:${port}/api`);
  console.log(`🚀 GraphQL Playground: http://localhost:${port}/graphql`);
}
bootstrap();
