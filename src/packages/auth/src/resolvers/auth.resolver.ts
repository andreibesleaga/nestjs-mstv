import { Resolver, Mutation, Args, Query, Context } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';
import { AuthService } from '../auth.service';
import {
  User,
  AuthPayload,
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  RefreshPayload,
  LogoutPayload,
} from '../dto/auth.dto';
import { CheckPolicies, PoliciesGuard } from '../policies.guard';
import { AppAbility } from '../abilities/user.ability';

@Resolver(() => User)
export class AuthResolver {
  private readonly logger = new Logger(AuthResolver.name);

  constructor(private readonly authService: AuthService) {}

  @Mutation(() => User)
  async register(@Args('input') input: RegisterInput): Promise<User> {
    try {
      this.logger.log(`GraphQL register attempt`);
      const user = await this.authService.register(input.email, input.password, input.name);
      return {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      this.logger.error('GraphQL register failed:', error);
      throw error;
    }
  }

  @Mutation(() => AuthPayload)
  async login(@Args('input') input: LoginInput): Promise<AuthPayload> {
    try {
      this.logger.log(`GraphQL login attempt`);
      const user = await this.authService.validateUser(input.email, input.password);

      const access_token = await this.authService.signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      const refresh_token = await this.authService.signRefreshToken(user.id.toString());

      return {
        access_token,
        refresh_token,
        user: {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      };
    } catch (error) {
      this.logger.error('GraphQL login failed:', error);
      throw error;
    }
  }

  @Mutation(() => RefreshPayload)
  async refreshToken(@Args('input') input: RefreshTokenInput): Promise<RefreshPayload> {
    try {
      this.logger.log(`GraphQL refresh token attempt`);
      const isRevoked = await this.authService.isRevoked(input.refresh_token);
      if (isRevoked) {
        throw new Error('Token has been revoked');
      }

      // In a real implementation, you would decode the refresh token to get user info
      // For now, we'll return a placeholder
      const access_token = await this.authService.signAccessToken({
        sub: 'placeholder',
        email: 'placeholder@example.com',
        role: 'user',
      });

      return { access_token };
    } catch (error) {
      this.logger.error('GraphQL refresh token failed:', error);
      throw error;
    }
  }

  @Mutation(() => LogoutPayload)
  async logout(@Args('input') input: RefreshTokenInput): Promise<LogoutPayload> {
    try {
      this.logger.log(`GraphQL logout attempt`);
      await this.authService.revokeRefreshToken(input.refresh_token);
      return { message: 'Successfully logged out' };
    } catch (error) {
      this.logger.error('GraphQL logout failed:', error);
      throw error;
    }
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', 'all'))
  @Query(() => User)
  async me(@Context() _context: any): Promise<User> {
    // This would typically extract user from JWT token in context
    // For now, return a placeholder
    this.logger.log(`GraphQL me query`);
    return {
      id: '1',
      email: 'user@example.com',
      name: 'Current User',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  @Query(() => [User])
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', 'all'))
  async users(): Promise<User[]> {
    this.logger.log(`GraphQL users query`);
    // This would typically fetch users from database
    // For now, return placeholder data
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
        email: 'user2@example.com',
        name: 'User Two',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }
}
