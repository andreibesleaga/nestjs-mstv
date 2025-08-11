import { Injectable, Inject } from '@nestjs/common';
import { CommandHandler } from '../../../../../common/cqrs/decorators';
import { ICommandHandler } from '../../../../../common/cqrs/interfaces';
import { EventBus } from '../../../../../common/cqrs/event-bus';
import { DeleteUserCommand } from '../commands/delete-user.command';
import { UserDeletedEvent } from '../events/user-deleted.event';
import { IUserRepository } from '../../../../../packages/packs/src/repositories/user.repository';

@Injectable()
@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand, void> {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
    private readonly eventBus: EventBus
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    const user = await this.userRepository.findById(command.id);
    if (!user) {
      throw new Error(`User with id ${command.id} not found`);
    }

    await this.userRepository.delete(command.id);

    await this.eventBus.publish(new UserDeletedEvent(command.id, user.email.getValue()));
  }
}
