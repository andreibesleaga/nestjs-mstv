export const KafkaMessageSchemas = {
  title: 'Kafka Message Schemas',
  description: 'Event-driven messaging schemas for user and authentication events',
  version: '1.0.0',

  topics: {
    'user.events': {
      description: 'User lifecycle events',
      partitions: 3,
      replicationFactor: 1,
      retentionMs: 604800000, // 7 days
      events: ['user.registered', 'user.updated', 'user.deleted'],
    },

    'auth.events': {
      description: 'Authentication and authorization events',
      partitions: 3,
      replicationFactor: 1,
      retentionMs: 259200000, // 3 days
      events: ['user.logged_in', 'user.logged_out', 'token.refreshed'],
    },

    'email.events': {
      description: 'Email notification events',
      partitions: 2,
      replicationFactor: 1,
      retentionMs: 86400000, // 1 day
      events: ['email.welcome', 'email.password_reset', 'email.verification'],
    },
  },

  messageSchemas: {
    'user.registered': {
      description: 'Published when a new user registers',
      topic: 'user.events',
      schema: {
        event: { type: 'string', value: 'user.registered', required: true },
        userId: { type: 'string', description: 'Unique user identifier', required: true },
        email: { type: 'string', description: 'User email address', required: true },
        name: { type: 'string', description: 'User full name', required: false },
        role: { type: 'string', description: 'User role', default: 'user', required: true },
        timestamp: {
          type: 'string',
          format: 'ISO 8601',
          description: 'Event timestamp',
          required: true,
        },
      },
      example: {
        event: 'user.registered',
        userId: 'cuid123',
        email: 'user@example.com',
        name: 'John Doe',
        role: 'user',
        timestamp: '2023-01-01T00:00:00.000Z',
      },
    },

    'user.updated': {
      description: 'Published when user profile is updated',
      topic: 'user.events',
      schema: {
        event: { type: 'string', value: 'user.updated', required: true },
        userId: { type: 'string', description: 'User identifier', required: true },
        changes: {
          type: 'object',
          description: 'Changed fields',
          properties: {
            email: { type: 'string', required: false },
            name: { type: 'string', required: false },
            role: { type: 'string', required: false },
          },
          required: true,
        },
        timestamp: { type: 'string', format: 'ISO 8601', required: true },
      },
      example: {
        event: 'user.updated',
        userId: 'cuid123',
        changes: { name: 'Jane Doe' },
        timestamp: '2023-01-01T00:00:00.000Z',
      },
    },

    'user.deleted': {
      description: 'Published when user account is deleted',
      topic: 'user.events',
      schema: {
        event: { type: 'string', value: 'user.deleted', required: true },
        userId: { type: 'string', description: 'Deleted user identifier', required: true },
        email: { type: 'string', description: 'User email for audit', required: true },
        deletedBy: { type: 'string', description: 'Admin who deleted the user', required: false },
        timestamp: { type: 'string', format: 'ISO 8601', required: true },
      },
      example: {
        event: 'user.deleted',
        userId: 'cuid123',
        email: 'user@example.com',
        deletedBy: 'admin456',
        timestamp: '2023-01-01T00:00:00.000Z',
      },
    },

    'user.logged_in': {
      description: 'Published when user successfully logs in',
      topic: 'auth.events',
      schema: {
        event: { type: 'string', value: 'user.logged_in', required: true },
        userId: { type: 'string', description: 'User identifier', required: true },
        sessionId: { type: 'string', description: 'Login session identifier', required: false },
        ipAddress: { type: 'string', description: 'Client IP address', required: false },
        userAgent: { type: 'string', description: 'Client user agent', required: false },
        timestamp: { type: 'string', format: 'ISO 8601', required: true },
      },
      example: {
        event: 'user.logged_in',
        userId: 'cuid123',
        sessionId: 'session789',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        timestamp: '2023-01-01T00:00:00.000Z',
      },
    },

    'user.logged_out': {
      description: 'Published when user logs out',
      topic: 'auth.events',
      schema: {
        event: { type: 'string', value: 'user.logged_out', required: true },
        userId: { type: 'string', description: 'User identifier', required: true },
        sessionId: { type: 'string', description: 'Ended session identifier', required: false },
        timestamp: { type: 'string', format: 'ISO 8601', required: true },
      },
      example: {
        event: 'user.logged_out',
        userId: 'cuid123',
        sessionId: 'session789',
        timestamp: '2023-01-01T00:00:00.000Z',
      },
    },

    'token.refreshed': {
      description: 'Published when access token is refreshed',
      topic: 'auth.events',
      schema: {
        event: { type: 'string', value: 'token.refreshed', required: true },
        userId: { type: 'string', description: 'User identifier', required: true },
        tokenId: { type: 'string', description: 'Refresh token identifier', required: false },
        timestamp: { type: 'string', format: 'ISO 8601', required: true },
      },
      example: {
        event: 'token.refreshed',
        userId: 'cuid123',
        tokenId: 'token456',
        timestamp: '2023-01-01T00:00:00.000Z',
      },
    },

    'email.welcome': {
      description: 'Published to trigger welcome email',
      topic: 'email.events',
      schema: {
        event: { type: 'string', value: 'email.welcome', required: true },
        userId: { type: 'string', description: 'User identifier', required: true },
        email: { type: 'string', description: 'Recipient email', required: true },
        name: { type: 'string', description: 'Recipient name', required: false },
        timestamp: { type: 'string', format: 'ISO 8601', required: true },
      },
      example: {
        event: 'email.welcome',
        userId: 'cuid123',
        email: 'user@example.com',
        name: 'John Doe',
        timestamp: '2023-01-01T00:00:00.000Z',
      },
    },

    'email.password_reset': {
      description: 'Published to trigger password reset email',
      topic: 'email.events',
      schema: {
        event: { type: 'string', value: 'email.password_reset', required: true },
        userId: { type: 'string', description: 'User identifier', required: true },
        email: { type: 'string', description: 'Recipient email', required: true },
        resetToken: { type: 'string', description: 'Password reset token', required: true },
        expiresAt: {
          type: 'string',
          format: 'ISO 8601',
          description: 'Token expiration',
          required: true,
        },
        timestamp: { type: 'string', format: 'ISO 8601', required: true },
      },
      example: {
        event: 'email.password_reset',
        userId: 'cuid123',
        email: 'user@example.com',
        resetToken: 'reset789',
        expiresAt: '2023-01-01T01:00:00.000Z',
        timestamp: '2023-01-01T00:00:00.000Z',
      },
    },
  },

  consumerGroups: {
    'user-service': {
      description: 'Handles user lifecycle events',
      topics: ['user.events'],
      autoOffsetReset: 'earliest',
    },

    'auth-service': {
      description: 'Handles authentication events',
      topics: ['auth.events'],
      autoOffsetReset: 'latest',
    },

    'email-service': {
      description: 'Handles email notification events',
      topics: ['email.events'],
      autoOffsetReset: 'earliest',
    },

    'analytics-service': {
      description: 'Processes all events for analytics',
      topics: ['user.events', 'auth.events'],
      autoOffsetReset: 'earliest',
    },
  },

  errorHandling: {
    deadLetterTopic: 'dlq.events',
    maxRetries: 3,
    retryBackoffMs: 1000,
    sessionTimeoutMs: 30000,
    heartbeatIntervalMs: 3000,
  },
};
