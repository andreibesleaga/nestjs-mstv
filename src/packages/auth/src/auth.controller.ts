import { Controller, Post, Body, UseGuards, Get, Request, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CheckPolicies, PoliciesGuard } from './policies.guard';
import { AppAbility } from './abilities/user.ability';
import { RegisterInput, LoginInput, RefreshTokenInput } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account with email, password, and optional name',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      example: {
        id: '1',
        email: 'user@example.com',
        name: 'John Doe',
        role: 'user',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    schema: {
      example: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for email: Invalid email format',
          statusCode: 400,
          timestamp: '2023-01-01T00:00:00.000Z',
          path: '/auth/register',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
    schema: {
      example: {
        success: false,
        error: {
          code: 'USER_ALREADY_EXISTS',
          message: 'User with email user@example.com already exists',
          statusCode: 409,
          timestamp: '2023-01-01T00:00:00.000Z',
          path: '/auth/register',
        },
      },
    },
  })
  @ApiBody({ type: RegisterInput })
  async register(@Body(ValidationPipe) body: RegisterInput) {
    const user = await this.auth.register(body.email, body.password, body.name);
    return {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Post('login')
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates user and returns access and refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '1',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'user',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          statusCode: 401,
          timestamp: '2023-01-01T00:00:00.000Z',
          path: '/auth/login',
        },
      },
    },
  })
  @ApiBody({ type: LoginInput })
  async login(@Body(ValidationPipe) body: LoginInput) {
    const user = await this.auth.validateUser(body.email, body.password);
    const access_token = await this.auth.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refresh_token = await this.auth.signRefreshToken(user.id.toString());

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
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Uses refresh token to generate a new access token',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      example: { access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or revoked refresh token',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          statusCode: 401,
          timestamp: '2023-01-01T00:00:00.000Z',
          path: '/auth/refresh',
        },
      },
    },
  })
  @ApiBody({ type: RefreshTokenInput })
  async refresh(@Body(ValidationPipe) body: RefreshTokenInput) {
    const valid = await this.auth.isRevoked(body.refresh_token);
    if (valid) {
      throw new Error('Token has been revoked');
    }
    // In real implementation, decode and validate the refresh token
    const access_token = await this.auth.signAccessToken({
      sub: 'placeholder',
      email: 'placeholder@example.com',
      role: 'user',
    });
    return { access_token };
  }

  @Post('logout')
  @ApiOperation({
    summary: 'User logout',
    description: 'Revokes the refresh token to log out the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: { message: 'Successfully logged out' },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid refresh token',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid refresh token',
          statusCode: 400,
          timestamp: '2023-01-01T00:00:00.000Z',
          path: '/auth/logout',
        },
      },
    },
  })
  @ApiBody({ type: RefreshTokenInput })
  async logout(@Body(ValidationPipe) body: RefreshTokenInput) {
    await this.auth.revokeRefreshToken(body.refresh_token);
    return { message: 'Successfully logged out' };
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', 'all'))
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Returns the authenticated user profile (requires authorization)',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        user: {
          id: '1',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'user',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      example: {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized access',
          statusCode: 401,
          timestamp: '2023-01-01T00:00:00.000Z',
          path: '/auth/profile',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
    schema: {
      example: {
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Insufficient permissions',
          statusCode: 403,
          timestamp: '2023-01-01T00:00:00.000Z',
          path: '/auth/profile',
        },
      },
    },
  })
  async getProfile(@Request() req) {
    // This endpoint requires read permission
    return { user: req.user };
  }

  @Get('users')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', 'all'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all users',
    description: 'Returns list of all users (requires admin permissions)',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      example: [
        {
          id: '1',
          email: 'user1@example.com',
          name: 'User One',
          role: 'user',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getUsers() {
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
}
