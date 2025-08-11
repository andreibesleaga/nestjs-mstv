// Export all schemas for easy importing
export * from './openapi.schemas';
export * from './graphql.schemas';
export * from './kafka.schemas';

// Schema registry for runtime validation
export const SchemaRegistry = {
  openapi: () => import('./openapi.schemas'),
  graphql: () => import('./graphql.schemas'),
  kafka: () => import('./kafka.schemas'),
};

// Schema documentation endpoints
export const SchemaEndpoints = {
  openapi: {
    json: '/api-json',
    ui: '/api',
    description: 'REST API OpenAPI 3.0 specification',
  },
  graphql: {
    endpoint: '/graphql',
    playground: '/graphql',
    schema: 'Auto-generated from GraphQL resolvers',
    description: 'GraphQL schema with introspection',
  },
  kafka: {
    file: '/src/schemas/kafka.schemas.ts',
    description: 'Event-driven messaging schemas for Kafka topics',
  },
};
