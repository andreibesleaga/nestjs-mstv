import { Injectable } from '@nestjs/common';
import { CommandBus } from '../../../common/cqrs/command-bus';
import { QueryBus } from '../../../common/cqrs/query-bus';
import { User } from '../domain/user.entity';
import { CreateUserCommand } from '../cqrs/commands/create-user.command';
import { UpdateUserCommand } from '../cqrs/commands/update-user.command';
import { DeleteUserCommand } from '../cqrs/commands/delete-user.command';
import { GetUserQuery } from '../cqrs/queries/get-user.query';
import { GetAllUsersQuery } from '../cqrs/queries/get-all-users.query';

@Injectable()
export class UsersService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  async getById(id: string): Promise<User | null> {
    return this.queryBus.execute(new GetUserQuery(id));
  }

  async getAllUsers(): Promise<User[]> {
    return this.queryBus.execute(new GetAllUsersQuery());
  }

  async createUser(email: string, password: string, name?: string, role?: string): Promise<User> {
    return this.commandBus.execute(new CreateUserCommand(email, password, name, role));
  }

  async updateUser(id: string, email?: string, name?: string, role?: string): Promise<User> {
    return this.commandBus.execute(new UpdateUserCommand(id, email, name, role));
  }

  async deleteUser(id: string): Promise<void> {
    return this.commandBus.execute(new DeleteUserCommand(id));
  }
}
