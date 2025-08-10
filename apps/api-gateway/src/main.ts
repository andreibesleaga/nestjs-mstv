
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from '../../../packages/auth/src/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger/OpenAPI setup
  const config = new DocumentBuilder()
    .setTitle('NestJS DDD Template API')
    .setDescription('Full-featured NestJS API with DDD, Clean Architecture, GraphQL, and REST')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Users', 'User management operations')
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.example.com', 'Production server')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'NestJS DDD API Documentation',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 API Gateway running on port ${port}`);
  console.log(`📖 REST API Documentation: http://localhost:${port}/api`);
  console.log(`🚀 GraphQL Playground: http://localhost:${port}/graphql`);
}
bootstrap();
