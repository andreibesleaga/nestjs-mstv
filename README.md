# NestJS Clean Architecture Template

This repo contains a full scaffold implementing:

- **DDD/Clean Architecture structure** - Domain entities, value objects, repositories
- **Prisma persistence for Users** - With migrations and seed scripts
- **Complete Auth flows** - register, login, refresh, logout with Redis revocation and hashed passwords
- **CASL-based authorization** - Policies and guard hooks for role-based access control
- **Kafka producer/consumer stubs** - Message publishing for user events
- **BullMQ worker** - Background job processing for emails
- **Full REST + GraphQL APIs** - Unified Fastify-based API gateway with both REST endpoints and GraphQL resolvers
- **OpenAPI/Swagger documentation** - Complete API documentation with interactive UI
- **Comprehensive test suites** - Unit and integration tests with proper mocking
- **Pre-commit hooks** - Husky with ESLint, Prettier, and automated testing
- **Helm chart + GitHub Actions CD** - Ready for AWS/EKS or Azure/AKS deployment

## Contents & Quick Start

1. Copy `.env.example` to `.env` and adjust values.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start supporting services:
   ```bash
   docker-compose -f docker/docker-compose.yml up --build -d
   ```
4. Generate Prisma client & migrate & seed:
   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate:dev --name init
   pnpm prisma:seed
   ```
5. Start API:
   ```bash
   pnpm start:dev
   ```
6. Run tests:
   ```bash
   pnpm test
   ```

## Development Workflow

### Code Quality

- **Linting**: `pnpm lint` - ESLint with TypeScript support
- **Formatting**: `pnpm format` - Prettier code formatting
- **Pre-commit hooks**: Automatically run linting, formatting, and unit tests
- **Pre-push hooks**: Run full test suite before pushing

### Testing

- **Unit tests**: `pnpm test:unit`
- **Integration tests**: `pnpm test:integration`
- **E2E tests**: `pnpm test:e2e`
- **All tests**: `pnpm test:all`

## Auth flows

- **Register**: `POST /auth/register` body: `{ "email", "password", "name" }`
- **Login**: `POST /auth/login` body: `{ "email", "password" }` returns `{ access_token, refresh_token }`
- **Refresh**: `POST /auth/refresh` body: `{ "refresh_token" }`
- **Logout**: `POST /auth/logout` body: `{ "refresh_token" }`

Tokens are JWT signed. Refresh tokens are stored on client; revocation is implemented via Redis keys (revoked:<token>).

## API Access

### REST API

- **Base URL**: `http://localhost:3000`
- **Documentation**: `http://localhost:3000/api` (Swagger UI)
- **OpenAPI Spec**: `http://localhost:3000/api-json`

### GraphQL API

- **Endpoint**: `http://localhost:3000/graphql`
- **Playground**: `http://localhost:3000/graphql` (development mode)
- **Schema**: Auto-generated from resolvers

## API Examples

### REST Endpoints

```bash
# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","name":"John Doe"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get profile (with JWT token)
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### GraphQL Queries

```graphql
# Register user
mutation {
  register(input: { email: "user@example.com", password: "password123", name: "John Doe" }) {
    id
    email
    name
    role
  }
}

# Login
mutation {
  login(input: { email: "user@example.com", password: "password123" }) {
    access_token
    refresh_token
    user {
      id
      email
      name
      role
    }
  }
}

# Get current user
query {
  me {
    id
    email
    name
    role
  }
}

# Get all users (admin only)
query {
  getAllUsers {
    id
    email
    name
    role
    createdAt
  }
}
```
