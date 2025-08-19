import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { UseGuards, UsePipes } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { CheckPolicies, PoliciesGuard } from '../policies.guard';
import { AppAbility, UserEntity } from '../abilities/user.ability';
import {
  User,
  AuthPayload,
  RefreshPayload,
  LogoutPayload,
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
} from '../dto/auth.dto';
import { ZodValidationPipe } from '../../../common/middlewares/zod-validation.pipe';
import {
  UserRegistrationSchema,
  UserLoginSchema,
  RefreshTokenSchema,
} from '../../../common/types/validation.schemas';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => User)
  @UsePipes(new ZodValidationPipe(UserRegistrationSchema))
  async register(@Args('input') input: RegisterInput): Promise<User> {
    const user = await this.authService.register(input.email, input.password, input.name);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Mutation(() => AuthPayload)
  @UsePipes(new ZodValidationPipe(UserLoginSchema))
  async login(@Args('input') input: LoginInput): Promise<AuthPayload> {
    const user = await this.authService.validateUser(input.email, input.password);
    const access_token = await this.authService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refresh_token = await this.authService.signRefreshToken(user.id);

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  @Mutation(() => RefreshPayload)
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  async refreshToken(@Args('input') input: RefreshTokenInput): Promise<RefreshPayload> {
    const access_token = await this.authService.refreshAccessToken(input.refresh_token);
    return { access_token };
  }

  @Mutation(() => LogoutPayload)
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  async logout(@Args('input') input: RefreshTokenInput): Promise<LogoutPayload> {
    await this.authService.revokeRefreshToken(input.refresh_token);
    return { message: 'Successfully logged out' };
  }

  @Query(() => User)
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', UserEntity))
  async me(@Context() context: any): Promise<User> {
    return context.req.user;
  }

  @Query(() => [User])
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', UserEntity))
  async users(): Promise<User[]> {
    return this.authService.getAllUsers();
  }

  @Query(() => [User])
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', UserEntity))
  async getAllUsers(): Promise<User[]> {
    return this.authService.getAllUsers();
  }

  @Query(() => User, { nullable: true })
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', UserEntity))
  async getUser(@Args('id') id: string): Promise<User | null> {
    const users = await this.authService.getAllUsers();
    return users.find((user) => user.id === id) || null;
  }

  @Mutation(() => Boolean)
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('delete', 'all'))
  async deleteUser(@Args('id') _id: string): Promise<boolean> {
    // Implementation would go here
    return true;
  }
}
