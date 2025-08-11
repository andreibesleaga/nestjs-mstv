import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler } from '../../../../../common/cqrs/decorators';
import { ICommandHandler } from '../../../../../common/cqrs/interfaces';
import { EventBus } from '../../../../../common/cqrs/event-bus';
import { CreateUserCommand } from '../commands/create-user.command';
import { UserCreatedEvent } from '../events/user-created.event';
import { IUserRepository } from '../../../../../packages/packs/src/repositories/user.repository';
import { User } from '../../domain/user.entity';

@Injectable()
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, User> {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    const user = new User({
      email: command.email,
      password: command.password,
      name: command.name,
      role: command.role,
    });

    const createdUser = await this.userRepository.create(user);

    await this.eventBus.publish(
      new UserCreatedEvent(
        createdUser.id,
        createdUser.email.getValue(),
        createdUser.name,
        createdUser.role
      )
    );

    return createdUser;
  }
}
