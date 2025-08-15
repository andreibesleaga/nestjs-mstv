import { ICommand } from '../../../../common/cqrs/interfaces';

export class CreateUserCommand implements ICommand {
  readonly type = 'CreateUserCommand';

  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly name?: string,
    public readonly role: string = 'user'
  ) {}
}
