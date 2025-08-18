# NestJS MSTV Template Architecture

## Overview

The NestJS MSTV (Microservices Template Variant) is a NestJs/Node.js based template implementing clean architecture principles with comprehensive microservices support. It provides a scalable foundation for building both modular monolith and distributed microservice domain driven applications back-ends with built-in observability, caching, circuit breakers, event-driven messaging, and multiple protocol and adapters support.

## Architecture Principles

- **Clean Architecture**: Clear separation of concerns with domain, application, infrastructure, and interface layers
- **CQRS (Command Query Responsibility Segregation)**: Separate read and write operations for better scalability
- **Domain-Driven Design**: Business logic encapsulated in domain entities and services
- **Microservices Ready**: Built-in service discovery, distributed tracing, and inter-service communication
- **Protocol Agnostic**: Support for HTTP/REST, GraphQL, WebSockets, gRPC, MQTT, and HTTPS

## Core Components

### 1. Application Layer Structure

```text
src/
├── apps/
│   └── api-gateway/           # Main application entry point
├── common/                    # Shared infrastructure components
├── modules/                   # Business domain modules
├── protocols/                 # Protocol implementations
└── schemas/                   # Generated GraphQL schemas
```

### 2. Clean Architecture Layers

#### Domain Layer (`modules/*/domain/`)

- **Entities**: Core business objects (User, etc.)
- **Value Objects**: Immutable data structures
- **Domain Services**: Business logic operations

#### Application Layer (`modules/*/application/`)

- **Services**: Application-specific business logic
- **Use Cases**: Orchestrate domain operations
- **DTOs**: Data transfer objects

#### Infrastructure Layer (`modules/*/infrastructure/`)

- **Repositories**: Data access implementations
- **External Services**: Third-party integrations

#### Interface Layer (`modules/*/interface/`)

- **Controllers**: HTTP/REST endpoints
- **Resolvers**: GraphQL query/mutation handlers
- **DTOs**: Input/output data structures

### 3. CQRS Implementation

```text
// Commands (Write Operations)
CreateUserCommand → CreateUserHandler → UserRepository
UpdateUserCommand → UpdateUserHandler → UserRepository
DeleteUserCommand → DeleteUserHandler → UserRepository

// Queries (Read Operations)
GetUserQuery → GetUserHandler → UserRepository
GetAllUsersQuery → GetAllUsersHandler → UserRepository
```

## Infrastructure Components

### 1. Database Support

- **PostgreSQL**: Primary relational database with Prisma ORM
- **MongoDB**: NoSQL option for flexible data structures
- **Dynamic Configuration**: Environment-based database selection

### 2. Caching Layer

- **Redis**: Distributed caching and session storage
- **Circuit Breaker**: Fault tolerance for external services
- **Performance Optimization**: Request/response caching

### 3. Service Discovery & Configuration

- **Consul**: Service discovery and configuration management
- **Health Checks**: Endpoint monitoring and status reporting
- **Dynamic Configuration**: Runtime configuration updates

### 4. Observability Stack

- **Jaeger**: Distributed tracing and request tracking
- **Performance Interceptors**: Response time monitoring
- **Structured Logging**: Comprehensive application logging
- **Health Monitoring**: Service health and dependency status

### 5. Message Queue & Event Streaming

- **Apache Kafka**: Event streaming and message processing
- **Zookeeper**: Kafka cluster coordination
- **Event Bus**: Internal event handling and processing

## Protocol Support

### 1. HTTP/REST API

```typescript
// RESTful endpoints with validation
POST /auth/register
POST /auth/login
GET  /users/:id
POST /users
```

### 2. GraphQL API

```graphql
# Queries and mutations with type safety
query {
  users {
    id
    email
    name
  }
}

mutation {
  register(email: "test@example.com", password: "password123") {
    token
  }
}
```

### 3. WebSocket Support

```typescript
// Real-time bidirectional communication
@WebSocketGateway()
export class AppWebSocketGateway {
  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any) { ... }
}
```

### 4. gRPC Services

```typescript
// High-performance RPC communication
@GrpcService('UserService')
export class GrpcUserService {
  async getUser(request: GetUserRequest): Promise<UserResponse> { ... }
}
```

### 5. MQTT Integration

```typescript
// IoT and real-time messaging
export class MqttService {
  publishUserEvent(userId: string, event: string) { ... }
}
```

### 6. HTTPS Support

```typescript
// Secure HTTP with SSL/TLS
export class HttpsService {
  createHttpsServer(options: HttpsOptions) { ... }
}
```

## Microservices Architecture Diagrams

### 1. Single Service Deployment

```mermaid
graph TB
    Client[Client Applications]
    LB[Load Balancer]

    subgraph "NestJS MSTV Service"
        API[API Gateway]
        Auth[Auth Module]
        Users[Users Module]
        Protocols[Protocol Layer]
    end

    subgraph "Infrastructure"
        DB[(PostgreSQL)]
        MongoDB[(MongoDB)]
        Redis[(Redis Cache)]
        Consul[Consul]
        Jaeger[Jaeger Tracing]
    end

    Client --> LB
    LB --> API
    API --> Auth
    API --> Users
    API --> Protocols

    Auth --> Redis
    Users --> DB
    Users --> MongoDB
    API --> Consul
    API --> Jaeger
```

Rendered diagram:

![Single Service Deployment](diagrams/svg/architecture_single_service.svg)

### 2. Multi-Service Microservices Architecture

```mermaid
graph TB
    Client[Client Applications]
    Gateway[API Gateway Service]

    subgraph "Business Services"
        UserService[User Service<br/>Port: 3001]
        AuthService[Auth Service<br/>Port: 3002]
        NotificationService[Notification Service<br/>Port: 3003]
        PaymentService[Payment Service<br/>Port: 3004]
    end

    subgraph "Infrastructure Services"
        DB1[(User DB<br/>PostgreSQL)]
        DB2[(Auth DB<br/>Redis)]
        DB3[(Notification DB<br/>MongoDB)]
        DB4[(Payment DB<br/>PostgreSQL)]
    end

    subgraph "Shared Infrastructure"
        Consul[Service Discovery<br/>Consul]
        Jaeger[Distributed Tracing<br/>Jaeger]
        Kafka[Event Streaming<br/>Kafka]
        MessageQueue[Message Queue]
    end

    Client --> Gateway
    Gateway --> UserService
    Gateway --> AuthService
    Gateway --> NotificationService
    Gateway --> PaymentService

    UserService --> DB1
    AuthService --> DB2
    NotificationService --> DB3
    PaymentService --> DB4

    UserService --> Consul
    AuthService --> Consul
    NotificationService --> Consul
    PaymentService --> Consul

    UserService --> Jaeger
    AuthService --> Jaeger
    NotificationService --> Jaeger
    PaymentService --> Jaeger

    UserService --> Kafka
    AuthService --> Kafka
    NotificationService --> Kafka
    PaymentService --> Kafka
```

Rendered diagram:

![Multi-Service Microservices Architecture](diagrams/svg/architecture_multi_service.svg)

### 3. Event-Driven Architecture with CQRS

```mermaid
graph TB
    subgraph "Command Side (Write)"
        Commands[Commands]
        CommandHandlers[Command Handlers]
        WriteDB[(Write Database<br/>PostgreSQL)]
        EventStore[(Event Store)]
    end

    subgraph "Event Processing"
        EventBus[Event Bus<br/>Kafka]
        EventHandlers[Event Handlers]
    end

    subgraph "Query Side (Read)"
        Queries[Queries]
        QueryHandlers[Query Handlers]
        ReadDB[(Read Database<br/>MongoDB)]
        Cache[(Cache<br/>Redis)]
    end

    subgraph "External Services"
        EmailService[Email Service]
        NotificationService[Notification Service]
        AuditService[Audit Service]
    end

    Commands --> CommandHandlers
    CommandHandlers --> WriteDB
    CommandHandlers --> EventStore
    EventStore --> EventBus

    EventBus --> EventHandlers
    EventHandlers --> ReadDB
    EventHandlers --> EmailService
    EventHandlers --> NotificationService
    EventHandlers --> AuditService

    Queries --> QueryHandlers
    QueryHandlers --> ReadDB
    QueryHandlers --> Cache
```

Rendered diagram:

![Event-Driven Architecture with CQRS](diagrams/svg/architecture_event_driven_cqrs.svg)

## Deployment Examples

### 1. Docker Compose Development

```yaml
# Full development stack
version: '3.8'
services:
  api-gateway:
    build: .
    ports: ['3000:3000']
    depends_on: [db, redis, kafka]

  user-service:
    build: .
    ports: ['3001:3000']
    environment:
      - SERVICE_NAME=user-service
      - DATABASE_URL=postgresql://user:pass@user-db:5432/users

  auth-service:
    build: .
    ports: ['3002:3000']
    environment:
      - SERVICE_NAME=auth-service
      - REDIS_URL=redis://redis:6379
```

### 2. Kubernetes Deployment

```yaml
# Kubernetes service deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nestjs-mstv-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nestjs-mstv
  template:
    metadata:
      labels:
        app: nestjs-mstv
    spec:
      containers:
        - name: api
          image: nestjs-mstv:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
            - name: CONSUL_HOST
              value: 'consul-service'
            - name: JAEGER_ENDPOINT
              value: 'http://jaeger-service:14268/api/traces'
```

### 3. AWS ECS with Service Discovery

```yaml
# ECS Task Definition
{
  'family': 'nestjs-mstv',
  'taskRoleArn': 'arn:aws:iam::account:role/ecsTaskRole',
  'containerDefinitions':
    [
      {
        'name': 'api-gateway',
        'image': 'your-repo/nestjs-mstv:latest',
        'portMappings': [{ 'containerPort': 3000, 'protocol': 'tcp' }],
        'environment': [{ 'name': 'CONSUL_HOST', 'value': 'consul.service.local' }],
        'serviceDiscovery': { 'namespace': 'nestjs-mstv.local' },
      },
    ],
}
```

## Usage Examples

### 1. As a Monolith

Deploy the entire application as a single service with all modules included:

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### 2. As Microservices

Split modules into separate services:

```bash
# User Service
SERVICE_NAME=user-service npm run start:prod

# Auth Service
SERVICE_NAME=auth-service npm run start:prod

# API Gateway
SERVICE_NAME=api-gateway npm run start:prod
```

### 3. Protocol-Specific Services

Deploy services optimized for specific protocols

## Configuration & Environment

### Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/db
MONGODB_URL=mongodb://user:pass@localhost:27017/db

# Service Discovery
CONSUL_HOST=localhost
CONSUL_PORT=8500

# Tracing
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Cache
REDIS_URL=redis://localhost:6379

# Message Queue
KAFKA_BROKERS=localhost:9092

# Security
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
```

## Testing Strategy

### Test Pyramid

```text
    E2E Tests (GraphQL, REST, WebSocket, gRPC)
         Integration Tests (Database, Cache, Services)
              Unit Tests (Services, Controllers, Entities)
                   Performance Tests (Load, Stress, Concurrent)
```

### Test Types

- **Unit Tests**: Individual component testing
- **Integration Tests**: Database and service integration
- **E2E Tests**: Full application workflow testing
- **Performance Tests**: Load and stress testing
- **Contract Tests**: API contract validation

## Best Practices

### 1. Service Design

- Keep services small and focused
- Design for failure with circuit breakers
- Implement proper retry mechanisms
- Use correlation IDs for request tracking

### 2. Data Management

- Choose appropriate database per service
- Implement eventual consistency where needed
- Use event sourcing for audit trails
- Cache frequently accessed data

### 3. Security

- Implement JWT-based authentication
- Use HTTPS in production
- Validate all inputs
- Implement rate limiting

### 4. Monitoring

- Enable distributed tracing
- Monitor service health
- Set up alerting for critical metrics
- Log structured data for analysis

### Other supported services

- Request-scoped context and Pino logs enriched with correlation IDs and traceId propagation.
- OpenTelemetry SDK with OTLP exporters (traces/metrics), optional Prometheus, and docs for Jaeger/SigNoz/Datadog.
- Circuit breaker via Fastify plugin and programmatic wrapper for outbound HTTP; `/health/circuit/:name` introspection.
- Database hardening: PgBouncer support for Postgres; MariaDB/MySQL support via Prisma with env-driven provider switching.
- Pluggable Storage Service with adapters: Memory, S3, Azure Blob, and GCS; gated by `ENABLE_STORAGE` and `STORAGE_PROVIDER`.
- Real cloud SDK wiring (AWS/Azure/GCP) with mocked unit tests to keep CI offline.
- Large file support: streaming upload/download with optional transform pipelines (e.g., gzip) and demo endpoints enabled in dev/test.

## Conclusion

The NestJS MSTV template provides a comprehensive foundation for building scalable, maintainable microservices applications. Its modular architecture, protocol support, and built-in infrastructure components make it suitable for various deployment scenarios, from simple monoliths to complex distributed systems.

The template emphasizes:

- **Developer Experience**: Clear structure and comprehensive tooling
- **Production Readiness**: Built-in observability and reliability features
- **Flexibility**: Multiple protocols and deployment options
- **Scalability**: Microservices-ready architecture with event-driven patterns

## Diagrams Index

Quick links to all rendered SVG diagrams:

- [Single Service Deployment](diagrams/svg/architecture_single_service.svg)
- [Multi-Service Microservices Architecture](diagrams/svg/architecture_multi_service.svg)
- [Event-Driven Architecture with CQRS](diagrams/svg/architecture_event_driven_cqrs.svg)
- [Core Architecture Overview](diagrams/svg/core_architecture.svg)
- [Multi-Microservice Gateway](diagrams/svg/multi_microservice_gateway.svg)
- [Choreography (Kafka)](diagrams/svg/choreography_kafka.svg)
- [Orchestration (Temporal)](diagrams/svg/orchestration_temporal.svg)
- [Coordination: Orchestration Flow](diagrams/svg/coordination_orchestration.svg)
- [Coordination: Signals Flow](diagrams/svg/coordination_signals.svg)
- [Coordination: Cron/Schedule](diagrams/svg/coordination_cron.svg)

Additional diagrams:

- [Request Lifecycle](diagrams/svg/request_lifecycle.svg)
- [JWT Authentication Flow](diagrams/svg/auth_jwt_flow.svg)
- [Authorization (CASL) Flow](diagrams/svg/authorization_casl_flow.svg)
- [Circuit Breaker State Machine](diagrams/svg/circuit_breaker_state_machine.svg)
- [Observability Pipeline (OTel → OTLP)](diagrams/svg/observability_pipeline.svg)
- [Storage Adapters](diagrams/svg/storage_adapters.svg)
- [Data Flow: User Profile](diagrams/svg/data_flow_user_profile.svg)
- [Deployment Options](diagrams/svg/deployment_options.svg)
- [Scalability Patterns](diagrams/svg/scalability_patterns.svg)
- [src Structure](diagrams/svg/src_structure.svg)
- [Overall System Architecture](diagrams/svg/overall_system_architecture.svg)
- [Microservice Run Modes](diagrams/svg/microservice_run_modes.svg)
- [Feature Flags Matrix](diagrams/svg/feature_flags_matrix.svg)
- [Coordination Topologies](diagrams/svg/coordination_topologies.svg)
