import { Injectable, Logger } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from '../modules/auth/auth.service';
import { FeatureFlagsService } from '../common/services/feature-flags.service';

interface GetUserRequest {
  id: string;
}

interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

interface ListUsersRequest {
  page: number;
  limit: number;
}

interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

@Controller()
@Injectable()
export class GrpcUserService {
  private readonly logger = new Logger(GrpcUserService.name);
  private isEnabled = false;

  constructor(
    private readonly authService: AuthService,
    private readonly featureFlags: FeatureFlagsService
  ) {
    this.isEnabled = this.featureFlags.isGrpcEnabled;
    if (!this.isEnabled) {
      this.logger.log('gRPC service is disabled by feature flag');
    }
  }

  @GrpcMethod('UserService', 'GetUser')
  async getUser(data: GetUserRequest): Promise<UserResponse> {
    if (!this.isEnabled) {
      throw new Error('gRPC service is disabled');
    }

    this.logger.log(`gRPC GetUser: ${data.id}`);

    // Mock response - integrate with actual user service
    return {
      id: data.id,
      email: 'user@example.com',
      name: 'John Doe',
      role: 'user',
      created_at: new Date().toISOString(),
    };
  }

  @GrpcMethod('UserService', 'CreateUser')
  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    this.logger.log(`gRPC CreateUser: ${data.email}`);

    try {
      const user = await this.authService.register(data.email, data.password, data.name);
      return {
        id: user.id,
        email: user.email,
        name: user.name || '',
        role: user.role,
        created_at: user.createdAt.toISOString(),
      };
    } catch (error) {
      this.logger.error('gRPC CreateUser failed:', error);
      throw error;
    }
  }

  @GrpcMethod('UserService', 'ListUsers')
  async listUsers(data: ListUsersRequest) {
    if (!this.isEnabled) {
      throw new Error('gRPC service is disabled');
    }

    this.logger.log(`gRPC ListUsers: page=${data.page}, limit=${data.limit}`);

    try {
      const users = await this.authService.getAllUsers();
      return {
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: user.role,
          created_at: user.createdAt.toISOString(),
        })),
        total: users.length,
      };
    } catch (error) {
      this.logger.error('gRPC ListUsers failed:', error);
      throw error;
    }
  }
}
