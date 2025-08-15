import { Injectable, Inject } from '@nestjs/common';
import { QueryHandler } from '../../../../common/cqrs/decorators';
import { IQueryHandler } from '../../../../common/cqrs/interfaces';
import { GetAllUsersQuery } from '../queries/get-all-users.query';
import { IUserRepository } from '../../repositories/user.repository';
import { User } from '../../domain/user.entity';

@Injectable()
@QueryHandler(GetAllUsersQuery)
export class GetAllUsersHandler implements IQueryHandler<GetAllUsersQuery, User[]> {
  constructor(@Inject('IUserRepository') private readonly userRepository: IUserRepository) {}

  async execute(_query: GetAllUsersQuery): Promise<User[]> {
    return this.userRepository.findAll();
  }
}
