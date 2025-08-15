import { ICommand } from '../../../../common/cqrs/interfaces';

export class DeleteUserCommand implements ICommand {
  readonly type = 'DeleteUserCommand';

  constructor(public readonly id: string) {}
}
