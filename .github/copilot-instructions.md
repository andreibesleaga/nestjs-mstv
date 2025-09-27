# GitHub Copilot Instructions for NestJS MSTV

This repository contains a **NestJS Microservice Template Variant** - a comprehensive microservices template implementing clean architecture principles with production-ready defaults.

## Project Architecture

### Core Structure

```
src/
├── apps/api-gateway/          # Main application entry point
├── common/                    # Shared infrastructure components
│   ├── config/               # Configuration management
│   ├── cqrs/                 # CQRS implementation
│   ├── messaging/            # Event-driven messaging
│   ├── microservice/         # Microservice utilities
│   ├── middlewares/          # Custom middlewares
│   ├── services/             # Shared services
│   ├── storage/              # Storage abstractions (S3, Azure, GCS)
│   └── types/                # TypeScript type definitions
├── modules/                   # Business domain modules
│   ├── auth/                 # Authentication & authorization
│   └── users/                # User management
├── protocols/                 # Protocol implementations
│   ├── grpc.service.ts       # gRPC support
│   ├── https.service.ts      # HTTPS endpoints
│   ├── mqtt.service.ts       # MQTT messaging
│   └── websocket.gateway.ts  # WebSocket real-time communication
└── schemas/                   # Generated GraphQL schemas
```

### Additional Components

- `coordination/` - Temporal.io workflow orchestration package
- `test/` - Comprehensive test suites (unit, integration, e2e)
- `docker/` - Docker configurations and compose files
- `helm/` - Kubernetes deployment charts
- `prisma/` - Database schema and migrations

## Architecture Patterns

### 1. Clean Architecture

- **Domain Layer**: Business logic in modules
- **Application Layer**: Use cases and command/query handlers
- **Infrastructure Layer**: External services, databases, protocols
- **Interface Layer**: Controllers, gateways, CLI

### 2. CQRS (Command Query Responsibility Segregation)

- Commands: Write operations that change state
- Queries: Read operations that return data
- Events: Domain events for decoupling and notifications
- **Location**: `src/common/cqrs/`
- **Usage**: Separate command and query handlers in modules

### 3. Event-Driven Architecture

- Event Bus for internal communication
- Kafka, MQTT, NATS for external messaging
- Event sourcing capabilities
- **Location**: `src/common/messaging/`

### 4. Microservice Patterns

- Service discovery (Consul)
- Circuit breakers (@fastify/circuit-breaker)
- Retry mechanisms
- Health checks
- Distributed tracing (OpenTelemetry)

## Technology Stack

### Core Framework

- **NestJS**: Main framework with Fastify adapter
- **TypeScript**: Primary language with strict typing
- **Fastify**: High-performance HTTP server
- **GraphQL**: API query language with Apollo Server

### Databases

- **PostgreSQL**: Primary relational database
- **MySQL/MariaDB**: Alternative relational database
- **MongoDB**: Document database option
- **Redis**: Caching and session storage
- **Prisma**: Database ORM and migrations

### Messaging & Communication

- **Kafka**: Event streaming
- **MQTT**: IoT messaging
- **NATS**: Cloud-native messaging
- **RabbitMQ**: Message queuing
- **gRPC**: High-performance RPC
- **WebSockets**: Real-time communication

### Observability

- **OpenTelemetry**: Distributed tracing and metrics
- **Prometheus**: Metrics collection
- **Pino**: Structured logging
- **Jaeger**: Tracing visualization
- **DataDog/SigNoz**: APM integrations

### Storage

- **AWS S3**: Object storage
- **Azure Blob**: Microsoft cloud storage
- **Google Cloud Storage**: Google cloud storage
- **In-memory**: Development/testing

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow NestJS decorators and dependency injection patterns
- Implement proper error handling with custom exceptions
- Use DTOs for request/response validation with class-validator
- Apply SOLID principles and clean code practices

### Testing Strategy

```bash
# Test commands available:
pnpm test:unit         # Unit tests with mocking
pnpm test:integration  # Integration tests with real dependencies
pnpm test:e2e         # End-to-end tests
pnpm test:all         # Unit + E2E (CI pipeline)
pnpm test:full        # All test types
```

### Test Structure

- **Unit Tests**: Mock external dependencies, test business logic
- **Integration Tests**: Use real databases, test service interactions
- **E2E Tests**: Full application testing via HTTP
- **Performance Tests**: Load testing with concurrent requests

### Database Operations

- Use Prisma for PostgreSQL/MySQL operations
- Use MongoDB native driver for document operations
- Implement repository pattern for data access
- Handle database switching via environment variables

### Security Implementation

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC) with CASL
- Input validation and sanitization
- Rate limiting and DDoS protection
- CORS configuration
- Security headers (Helmet)
- Circuit breaker pattern for fault tolerance

### Environment Configuration

- Use `.env.example` as template for basic setup
- Use `.env.example.legacy` for full feature set
- Support multiple database types via `DATABASE_TYPE` env var
- Optional features controlled by environment flags

## Common Patterns

### 1. Module Structure

```typescript
@Module({
  imports: [CommonModule /* other modules */],
  controllers: [ModuleController],
  providers: [ModuleService, ModuleRepository],
  exports: [ModuleService],
})
export class ModuleModule {}
```

### 2. CQRS Implementation

```typescript
// Command
export class CreateUserCommand {
  constructor(public readonly userData: CreateUserDto) {}
}

// Command Handler
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  async execute(command: CreateUserCommand): Promise<User> {
    // Implementation
  }
}

// Query
export class GetUserQuery {
  constructor(public readonly id: string) {}
}

// Query Handler
@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  async execute(query: GetUserQuery): Promise<User> {
    // Implementation
  }
}
```

### 3. Error Handling

```typescript
import { HttpException, HttpStatus } from '@nestjs/common';

// Custom exceptions
export class UserNotFoundException extends HttpException {
  constructor(id: string) {
    super(`User with ID ${id} not found`, HttpStatus.NOT_FOUND);
  }
}
```

### 4. Protocol Implementation

- REST APIs with OpenAPI/Swagger documentation
- GraphQL with schema-first approach
- gRPC with proto definitions
- WebSocket gateways for real-time features
- MQTT for IoT device communication

## Temporal Coordination

The `coordination/` package provides workflow orchestration:

- **Cron Schedules**: Time-based workflow triggers
- **Orchestration**: Saga pattern with compensations
- **Choreography**: Event-driven coordination via signals
- **Health Checks**: Automated service health monitoring

### Temporal Usage

```bash
# Start local Temporal server
pnpm coordination:temporal:up

# Run coordination worker
pnpm coordination:worker

# Test workflow execution
pnpm coordination:smoke
```

## Docker & Deployment

### Development

```bash
# Basic services (PostgreSQL, Redis)
pnpm docker:up

# Full stack with all services
pnpm docker:full
```

### Production

- Multi-stage Docker builds
- Kubernetes Helm charts in `helm/` directory
- Health check endpoints
- Graceful shutdown handling
- Environment-specific configurations

## Key Commands

```bash
# Development
pnpm start:dev                 # Start development server
pnpm lint                      # Run ESLint with auto-fix
pnpm format                    # Format code with Prettier

# Database
pnpm prisma:generate           # Generate Prisma client
pnpm prisma:migrate:dev        # Run database migrations
pnpm mongodb:migrate           # MongoDB migrations

# Testing
pnpm test:all                  # CI pipeline tests
pnpm test:performance          # Load testing

# Coordination
pnpm coordination:smoke:local  # Full Temporal workflow test
```

## Best Practices for Copilot

1. **Module-First Approach**: Create business modules in `src/modules/` with proper separation of concerns
2. **Protocol Flexibility**: Support multiple communication protocols based on use case
3. **Database Agnostic**: Write code that works with PostgreSQL, MySQL, or MongoDB
4. **Testing Strategy**: Always include unit tests with proper mocking
5. **Error Handling**: Implement proper exception handling and logging
6. **Security**: Apply security headers, validation, and authentication patterns
7. **Performance**: Use caching, connection pooling, and circuit breakers
8. **Observability**: Include structured logging and tracing
9. **Environment Config**: Make features configurable via environment variables
10. **Documentation**: Keep README.md and architecture docs updated

## File Naming Conventions

- Controllers: `*.controller.ts`
- Services: `*.service.ts`
- Modules: `*.module.ts`
- DTOs: `*.dto.ts`
- Entities: `*.entity.ts`
- Guards: `*.guard.ts`
- Interceptors: `*.interceptor.ts`
- Middlewares: `*.middleware.ts`
- Tests: `*.spec.ts` (unit), `*.e2e.spec.ts` (e2e), `*.integration.spec.ts` (integration)

This template is designed to be **simple by default, scalable by choice** - enable only the features you need while maintaining production-ready defaults.
