import { Module } from '@nestjs/common';
import { CqrsModule } from '../../../common/cqrs/cqrs.module';
import { UsersController } from './users.controller';
import { UsersResolver } from './users.resolver';
import { UsersService } from '../application/users.service';
import { PrismaUserRepo } from '../infrastructure/prisma-user.repo';
import { MongoUserRepo } from '../infrastructure/mongo-user.repo';
import { PrismaService } from '../../../common/services/prisma.service';
import { MongoDbService } from '../../../common/services/mongodb.service';
import { DatabaseConfig } from '../../../common/config/database.config';
import { CreateUserHandler } from '../cqrs/handlers/create-user.handler';
import { UpdateUserHandler } from '../cqrs/handlers/update-user.handler';
import { DeleteUserHandler } from '../cqrs/handlers/delete-user.handler';
import { GetUserHandler } from '../cqrs/handlers/get-user.handler';
import { GetAllUsersHandler } from '../cqrs/handlers/get-all-users.handler';
import { UserMessagingModule } from '../messaging/user-messaging.module';

@Module({
  imports: [CqrsModule, UserMessagingModule],
  controllers: [UsersController],
  providers: [
    PrismaService,
    MongoDbService,
    UsersService,
    UsersResolver,
    CreateUserHandler,
    UpdateUserHandler,
    DeleteUserHandler,
    GetUserHandler,
    GetAllUsersHandler,
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
