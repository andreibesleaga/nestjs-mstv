import { Injectable, Inject } from '@nestjs/common';
import { QueryHandler } from '../../../../common/cqrs/decorators';
import { IQueryHandler } from '../../../../common/cqrs/interfaces';
import { GetUserQuery } from '../queries/get-user.query';
import { IUserRepository } from '../../repositories/user.repository';
import { User } from '../../domain/user.entity';

@Injectable()
@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery, User | null> {
  constructor(@Inject('IUserRepository') private readonly userRepository: IUserRepository) {}

  async execute(query: GetUserQuery): Promise<User | null> {
    return this.userRepository.findById(query.id);
  }
}
