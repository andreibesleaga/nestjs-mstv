export const GraphQLSchemaDocumentation = {
  title: 'GraphQL API Schema',
  description: 'Complete GraphQL schema for authentication and user management',
  version: '1.0.0',

  types: {
    User: {
      description: 'User entity with authentication and profile information',
      fields: {
        id: { type: 'ID!', description: 'Unique user identifier' },
        email: { type: 'String!', description: 'User email address' },
        name: { type: 'String', description: 'User full name (optional)' },
        role: { type: 'String!', description: 'User role (user|admin)' },
        createdAt: { type: 'DateTime!', description: 'Account creation timestamp' },
        updatedAt: { type: 'DateTime!', description: 'Last profile update timestamp' },
      },
    },

    AuthPayload: {
      description: 'Authentication response with tokens and user data',
      fields: {
        access_token: { type: 'String!', description: 'JWT access token for API authentication' },
        refresh_token: { type: 'String!', description: 'JWT refresh token for token renewal' },
        user: { type: 'User!', description: 'Authenticated user information' },
      },
    },

    RefreshPayload: {
      description: 'Token refresh response',
      fields: {
        access_token: { type: 'String!', description: 'New JWT access token' },
      },
    },

    LogoutPayload: {
      description: 'Logout confirmation response',
      fields: {
        message: { type: 'String!', description: 'Logout success message' },
      },
    },
  },

  inputs: {
    RegisterInput: {
      description: 'User registration input data',
      fields: {
        email: { type: 'String!', description: 'Valid email address' },
        password: { type: 'String!', description: 'Password (minimum 6 characters)' },
        name: { type: 'String', description: 'Full name (optional)' },
      },
    },

    LoginInput: {
      description: 'User login credentials',
      fields: {
        email: { type: 'String!', description: 'Registered email address' },
        password: { type: 'String!', description: 'User password' },
      },
    },

    RefreshTokenInput: {
      description: 'Token refresh input',
      fields: {
        refresh_token: { type: 'String!', description: 'Valid refresh token' },
      },
    },
  },

  queries: {
    me: {
      description: 'Get current authenticated user profile',
      returns: 'User!',
      auth: 'Required - JWT Bearer token',
      permissions: 'User must be authenticated',
    },

    users: {
      description: 'Get list of all users (admin only)',
      returns: '[User!]!',
      auth: 'Required - JWT Bearer token',
      permissions: 'Admin role required',
    },

    getAllUsers: {
      description: 'Get all users with full details (admin only)',
      returns: '[User!]!',
      auth: 'Required - JWT Bearer token',
      permissions: 'Admin role required',
    },

    getUser: {
      description: 'Get user by ID (admin only)',
      args: { id: { type: 'ID!', description: 'User identifier' } },
      returns: 'User',
      auth: 'Required - JWT Bearer token',
      permissions: 'Admin role required',
    },
  },

  mutations: {
    register: {
      description: 'Register new user account',
      args: { input: { type: 'RegisterInput!', description: 'Registration data' } },
      returns: 'User!',
      auth: 'Not required',
      errors: ['VALIDATION_ERROR', 'USER_ALREADY_EXISTS'],
    },

    login: {
      description: 'Authenticate user and get tokens',
      args: { input: { type: 'LoginInput!', description: 'Login credentials' } },
      returns: 'AuthPayload!',
      auth: 'Not required',
      errors: ['INVALID_CREDENTIALS', 'VALIDATION_ERROR'],
    },

    refreshToken: {
      description: 'Refresh access token using refresh token',
      args: { input: { type: 'RefreshTokenInput!', description: 'Refresh token' } },
      returns: 'RefreshPayload!',
      auth: 'Not required',
      errors: ['INVALID_TOKEN', 'TOKEN_EXPIRED'],
    },

    logout: {
      description: 'Logout user and revoke refresh token',
      args: { input: { type: 'RefreshTokenInput!', description: 'Refresh token to revoke' } },
      returns: 'LogoutPayload!',
      auth: 'Not required',
      errors: ['INVALID_TOKEN'],
    },

    deleteUser: {
      description: 'Delete user account (admin only)',
      args: { id: { type: 'ID!', description: 'User ID to delete' } },
      returns: 'Boolean!',
      auth: 'Required - JWT Bearer token',
      permissions: 'Admin role required',
      errors: ['UNAUTHORIZED', 'USER_NOT_FOUND'],
    },
  },

  scalars: {
    DateTime: {
      description: 'ISO 8601 date-time string',
      example: '2023-01-01T00:00:00.000Z',
    },
  },

  errorCodes: {
    VALIDATION_ERROR: 'Input validation failed',
    USER_ALREADY_EXISTS: 'Email address already registered',
    INVALID_CREDENTIALS: 'Invalid email or password',
    INVALID_TOKEN: 'Token is invalid or expired',
    TOKEN_EXPIRED: 'Token has expired',
    UNAUTHORIZED: 'Authentication required',
    AUTHORIZATION_ERROR: 'Insufficient permissions',
    USER_NOT_FOUND: 'User does not exist',
  },
};
