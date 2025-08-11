import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from '../../../packages/auth/src/filters/global-exception.filter';
import {
  UserSchema,
  LoginResponseSchema,
  RefreshResponseSchema,
  LogoutResponseSchema,
  HealthResponseSchema,
  ErrorResponseSchema,
} from '../../../schemas/openapi.schemas';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      trustProxy: true,
      bodyLimit: parseInt(process.env.BODY_LIMIT || '1048576'),
    })
  );

  // Security headers
  await app.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // Rate limiting
  await app.register(require('@fastify/rate-limit'), {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
    skipOnError: true,
    keyGenerator: (req) => req.ip,
  });

  // Compression
  await app.register(require('@fastify/compress'), {
    encodings: ['gzip', 'deflate'],
  });

  // Sensible defaults
  await app.register(require('@fastify/sensible'));

  // CORS with security
  await app.register(require('@fastify/cors'), {
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || false
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Global validation pipe with security
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Security headers via Fastify hooks
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onSend', async (request, reply, payload) => {
      reply.header('X-Frame-Options', 'DENY');
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
      reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

      // Prevent caching of sensitive endpoints
      if (request.url?.includes('/auth/') || request.url?.includes('/users/')) {
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        reply.header('Pragma', 'no-cache');
        reply.header('Expires', '0');
      }

      return payload;
    });

  // Swagger/OpenAPI setup
  const { swaggerConfig } = await import('./openapi.config');
  const config = swaggerConfig;

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      UserSchema,
      LoginResponseSchema,
      RefreshResponseSchema,
      LogoutResponseSchema,
      HealthResponseSchema,
      ErrorResponseSchema,
    ],
  });
  await app.register(require('@fastify/swagger'), {
    swagger: document,
  });
  // Only enable Swagger in development
  if (process.env.NODE_ENV !== 'production') {
    await app.register(require('@fastify/swagger-ui'), {
      routePrefix: '/api',
      uiConfig: {
        persistAuthorization: true,
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
    });
  }

  const port = process.env.PORT || 3000;
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
  await app.listen(port, host);

  console.log(`🚀 API Gateway (Fastify) running on port ${port}`);
  console.log(`📖 REST API Documentation: http://localhost:${port}/api`);
  console.log(`🚀 GraphQL Playground: http://localhost:${port}/graphql`);
  console.log(`📋 OpenAPI JSON: http://localhost:${port}/api-json`);
  console.log(`📊 GraphQL Schema: Auto-generated from resolvers`);
  console.log(`📨 Kafka Schemas: Available in /src/schemas/kafka.schemas.ts`);
}
bootstrap();
