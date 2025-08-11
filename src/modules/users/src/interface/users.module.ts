import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersResolver } from './users.resolver';
import { UsersService } from '../application/users.service';
import { PrismaUserRepo } from '../infrastructure/prisma-user.repo';
import { MongoUserRepo } from '../infrastructure/mongo-user.repo';
import { PrismaService } from '../../../../common/prisma.service';
import { MongoDbService } from '../../../../common/mongodb.service';
import { DatabaseConfig } from '../../../../common/database.config';

@Module({
  controllers: [UsersController],
  providers: [
    PrismaService,
    MongoDbService,
    UsersService,
    UsersResolver,
    {
      provide: 'IUserRepository',
      useFactory: (prismaService: PrismaService, mongoService: MongoDbService) => {
        return DatabaseConfig.isMongoDb() 
          ? new MongoUserRepo(mongoService) 
          : new PrismaUserRepo(prismaService);
      },
      inject: [PrismaService, MongoDbService],
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}