import { IEvent } from '../../../../common/cqrs/interfaces';

export class UserCreatedEvent implements IEvent {
  readonly type = 'UserCreatedEvent';
  readonly timestamp = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly email: string,
    public readonly name?: string,
    public readonly role: string = 'user'
  ) {}
}
