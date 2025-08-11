import { IEvent } from '../../../../../common/cqrs/interfaces';

export class UserDeletedEvent implements IEvent {
  readonly type = 'UserDeletedEvent';
  readonly timestamp = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly email: string,
    public readonly deletedBy?: string
  ) {}
}
