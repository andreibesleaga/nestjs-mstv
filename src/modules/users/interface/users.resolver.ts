import { Resolver, Query, Args } from '@nestjs/graphql';
import { UsersService } from '../application/users.service';
import { User } from '../../auth/dto/auth.dto';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User, { nullable: true })
  async user(@Args('id') id: string) {
    return this.usersService.getById(id);
  }
}
