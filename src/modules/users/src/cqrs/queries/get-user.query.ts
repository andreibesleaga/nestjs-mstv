import { IQuery } from '../../../../../common/cqrs/interfaces';

export class GetUserQuery implements IQuery {
  readonly type = 'GetUserQuery';

  constructor(public readonly id: string) {}
}
