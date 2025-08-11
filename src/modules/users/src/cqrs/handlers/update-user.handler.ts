import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler } from '../../../../../common/cqrs/decorators';
import { ICommandHandler } from '../../../../../common/cqrs/interfaces';
import { EventBus } from '../../../../../common/cqrs/event-bus';
import { UpdateUserCommand } from '../commands/update-user.command';
import { UserUpdatedEvent } from '../events/user-updated.event';
import { IUserRepository } from '../../../../../packages/packs/src/repositories/user.repository';
import { User } from '../../domain/user.entity';
import { Email } from '../../domain/value-objects';

@Injectable()
@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand, User> {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: UpdateUserCommand): Promise<User> {
    const updateData: any = {};
    if (command.email) updateData.email = new Email(command.email);
    if (command.name !== undefined) updateData.name = command.name;
    if (command.role) updateData.role = command.role;

    const updatedUser = await this.userRepository.update(command.id, updateData);

    await this.eventBus.publish(new UserUpdatedEvent(updatedUser.id, updateData));

    return updatedUser;
  }
}
