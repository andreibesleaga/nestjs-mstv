import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('NestJS DDD Template API')
  .setDescription(
    `
    Full-featured NestJS API with DDD, Clean Architecture, GraphQL, and REST
    
    ## Features
    - **Authentication**: JWT-based auth with refresh tokens
    - **Authorization**: CASL-based role permissions
    - **GraphQL**: Full GraphQL API with playground
    - **REST**: Complete REST API with OpenAPI docs
    - **Messaging**: Kafka event streaming
    - **Background Jobs**: BullMQ worker processing
    - **Database**: Prisma ORM with PostgreSQL
    - **Testing**: Comprehensive test suites
  `
  )
  .setVersion('1.0.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth'
  )
  .addTag('Authentication', 'User authentication and authorization endpoints')
  .addTag('Users', 'User management operations')
  .addTag('Health', 'Application health and status endpoints')
  .addServer(
    process.env.NODE_ENV === 'production' 
      ? process.env.API_BASE_URL || 'https://api.yourdomain.com'
      : `http://localhost:${process.env.PORT || 3000}`,
    process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
  )
  .setContact('API Support', 'https://example.com/support', 'support@example.com')
  .setLicense('MIT', 'https://opensource.org/licenses/MIT')
  .build();
