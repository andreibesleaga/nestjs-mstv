import { ApiProperty } from '@nestjs/swagger';

// User Schemas
export class UserSchema {
  @ApiProperty({ example: 'cuid123', description: 'Unique user identifier' })
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'User full name', required: false })
  name?: string;

  @ApiProperty({ example: 'user', enum: ['user', 'admin'], description: 'User role' })
  role: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'Last update timestamp' })
  updatedAt: Date;
}

// Auth Schemas
export class LoginResponseSchema {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  access_token: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token',
  })
  refresh_token: string;

  @ApiProperty({ type: UserSchema, description: 'User information' })
  user: UserSchema;
}

export class RefreshResponseSchema {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'New JWT access token',
  })
  access_token: string;
}

export class LogoutResponseSchema {
  @ApiProperty({ example: 'Successfully logged out', description: 'Logout confirmation message' })
  message: string;
}

// Health Schemas
export class HealthResponseSchema {
  @ApiProperty({ example: 'ok', description: 'Application health status' })
  status: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z', description: 'Current timestamp' })
  timestamp: string;

  @ApiProperty({ example: 12345, description: 'Application uptime in seconds' })
  uptime: number;

  @ApiProperty({ example: '1.0.0', description: 'Application version' })
  version: string;
}

// Error Schemas
export class ErrorResponseSchema {
  @ApiProperty({ example: false, description: 'Success indicator' })
  success: boolean;

  @ApiProperty({
    type: 'object',
    properties: {
      code: { type: 'string', example: 'VALIDATION_ERROR' },
      message: { type: 'string', example: 'Validation failed for email: Invalid email format' },
      statusCode: { type: 'number', example: 400 },
      timestamp: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
      path: { type: 'string', example: '/auth/register' },
    },
    description: 'Error details',
  })
  error: object;
}
