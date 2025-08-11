import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersResolver } from './users.resolver';
import { UsersService } from '../application/users.service';
import { PrismaUserRepo } from '../infrastructure/prisma-user.repo';
import { PrismaService } from '../../../../common/prisma.service';

@Module({
  controllers: [UsersController],
  providers: [
    PrismaService,
    UsersService,
    UsersResolver,
    { provide: 'IUserRepository', useClass: PrismaUserRepo },
  ],
  exports: [UsersService],
})
export class UsersModule {}
