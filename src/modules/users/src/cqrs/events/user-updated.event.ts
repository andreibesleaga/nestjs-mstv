import { IEvent } from '../../../../../common/cqrs/interfaces';

export class UserUpdatedEvent implements IEvent {
  readonly type = 'UserUpdatedEvent';
  readonly timestamp = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly changes: Record<string, any>
  ) {}
}
