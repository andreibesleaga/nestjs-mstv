import { ICommand } from '../../../../../common/cqrs/interfaces';

export class UpdateUserCommand implements ICommand {
  readonly type = 'UpdateUserCommand';

  constructor(
    public readonly id: string,
    public readonly email?: string,
    public readonly name?: string,
    public readonly role?: string
  ) {}
}
