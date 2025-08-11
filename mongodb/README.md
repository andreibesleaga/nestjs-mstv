# MongoDB Setup and Usage

## Quick Start

### 1. Set Environment Variables
```bash
DATABASE_TYPE=mongodb
MONGODB_URL=mongodb://dev:dev@localhost:27017/nestjs-app
```

### 2. Start MongoDB
```bash
# Using Docker
docker run -d --name mongodb -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=dev -e MONGO_INITDB_ROOT_PASSWORD=dev mongo:7

# Or using docker-compose
pnpm docker:full
```

### 3. Run Migrations
```bash
pnpm mongodb:migrate
```

### 4. Seed Database
```bash
pnpm mongodb:seed
```

## Migration Commands

```bash
# Run all pending migrations
pnpm mongodb:migrate

# Rollback last migration
pnpm mongodb:rollback

# Create new migration (manual)
# Create file: mongodb/migrations/003_your_migration.ts
```

## Seeding Commands

```bash
# Run all seeds
pnpm mongodb:seed
```

## Migration Structure

```typescript
// mongodb/migrations/001_example.ts
import { Db } from 'mongodb';

export async function up(db: Db): Promise<void> {
  // Migration logic
  await db.createCollection('example');
  await db.collection('example').createIndex({ field: 1 });
}

export async function down(db: Db): Promise<void> {
  // Rollback logic
  await db.collection('example').drop();
}
```

## Seed Structure

```typescript
// mongodb/seeds/example.seed.ts
import { Db } from 'mongodb';

export async function seed(db: Db): Promise<void> {
  const collection = db.collection('example');
  
  const existing = await collection.findOne({ _id: 'example-id' });
  if (!existing) {
    await collection.insertOne({
      _id: 'example-id',
      data: 'example',
      createdAt: new Date(),
    });
  }
}
```

## Collections

### Users Collection
- **Indexes**: email (unique), role, email+role (compound)
- **Fields**: _id, email, name, password, role, createdAt, updatedAt

### Refresh Tokens Collection  
- **Indexes**: token (unique), userId, expiresAt (TTL), userId+revoked (compound)
- **Fields**: _id, token, userId, revoked, expiresAt, createdAt, updatedAt
- **TTL**: Automatic cleanup based on expiresAt field

## Default Users

After seeding, these users are available:

- **Admin**: admin@example.com / changeme
- **User**: user@example.com / password123