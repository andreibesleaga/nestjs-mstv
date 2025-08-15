import { IQuery } from '../../../../common/cqrs/interfaces';

export class GetAllUsersQuery implements IQuery {
  readonly type = 'GetAllUsersQuery';

  constructor(
    public readonly limit?: number,
    public readonly offset?: number
  ) {}
}
