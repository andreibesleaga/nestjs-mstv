import { Injectable, Inject } from '@nestjs/common';
import { User } from '../domain/user.entity';
import { IUserRepository } from '../../../../packages/packs/src/repositories/user.repository';

@Injectable()
export class UsersService {
  constructor(@Inject('IUserRepository') private readonly usersRepo: IUserRepository) {}

  async getById(id: string): Promise<User | null> {
    return this.usersRepo.findById(id);
  }
}
