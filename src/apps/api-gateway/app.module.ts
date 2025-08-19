import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { UsersModule } from '../../modules/users/interface/users.module';
import { AuthModule } from '../../modules/auth/auth.module';
import { HealthController } from './health.controller';
import { SchemasController } from './schemas.controller';
import { DemoController } from './demo.controller';
import { MicroserviceController } from '../../common/microservice/microservice.controller';
import { HealthService } from '../../common/health.service';
import { PrismaService } from '../../common/prisma.service';
import { MongoDbService } from '../../common/mongodb.service';
import { RedisClient } from '../../modules/auth/redis.client';
import { DatabaseConfig } from '../../common/database.config';
import { MicroserviceConfig } from '../../common/microservice.config';
import { ProtocolsModule } from '../../protocols/protocols.module';
import { CommonModule } from '../../common/common.module';
import { MicroserviceModule } from '../../common/microservice/microservice.module';

const databaseProviders =
  process.env.NODE_ENV === 'test'
    ? [PrismaService, MongoDbService] // Provide both for tests
    : DatabaseConfig.isMongoDb()
      ? [MongoDbService]
      : [PrismaService];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schemas/schema.gql'),
      playground: process.env.NODE_ENV === 'development',
      introspection: process.env.NODE_ENV !== 'production',
      context: ({ req }) => ({ req }),
      formatError: (error) => {
        return {
          message: error.message,
          code: error.extensions?.code,
          locations: error.locations,
          path: error.path,
        };
      },
    }),
    AuthModule,
    UsersModule,
    ProtocolsModule,
    MicroserviceModule,
  ],
  controllers: [
    HealthController,
    SchemasController,
    MicroserviceController,
    // Expose demo routes in test and development, hide in production
    ...(process.env.NODE_ENV !== 'production' ? [DemoController] : []),
  ],
  providers: [
    HealthService,
    RedisClient,
    MicroserviceConfig,
    // Feature-flagged services are provided/exported by CommonModule
    ...databaseProviders,
  ],
})
export class AppModule {}
