import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';
import { UsersService } from '../application/users.service';
import { User } from '../../../../packages/auth/src/dto/auth.dto';
import { CheckPolicies, PoliciesGuard } from '../../../../packages/auth/src/policies.guard';
import { AppAbility } from '../../../../packages/auth/src/abilities/user.ability';

@Resolver(() => User)
export class UsersResolver {
  private readonly logger = new Logger(UsersResolver.name);

  constructor(private readonly usersService: UsersService) {}

  @Query(() => [User], { name: 'getAllUsers' })
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', 'all'))
  async findAll(): Promise<User[]> {
    this.logger.log('GraphQL getAllUsers query');
    // This would typically fetch from database
    return [
      {
        id: '1',
        email: 'user1@example.com',
        name: 'User One',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  @Query(() => User, { name: 'getUser', nullable: true })
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', 'all'))
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<User | null> {
    this.logger.log(`GraphQL getUser query for ID: ${id}`);
    const user = await this.usersService.getById(id);
    if (!user) return null;

    return {
      id: user.id.toString(),
      email: user.email.getValue(),
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Mutation(() => Boolean)
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('delete', 'all'))
  async deleteUser(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    this.logger.log(`GraphQL deleteUser mutation for ID: ${id}`);
    // This would typically delete from database
    return true;
  }
}
