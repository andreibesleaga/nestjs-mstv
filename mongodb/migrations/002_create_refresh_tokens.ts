import { Db } from 'mongodb';

export async function up(db: Db): Promise<void> {
  // Create refresh_tokens collection
  await db.createCollection('refresh_tokens');
  
  // Create unique index on token
  await db.collection('refresh_tokens').createIndex({ token: 1 }, { unique: true });
  
  // Create index on userId for faster user token lookups
  await db.collection('refresh_tokens').createIndex({ userId: 1 });
  
  // Create TTL index on expiresAt for automatic cleanup
  await db.collection('refresh_tokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  
  // Create compound index for active token queries
  await db.collection('refresh_tokens').createIndex({ userId: 1, revoked: 1 });
  
  console.log('Created refresh_tokens collection with indexes');
}

export async function down(db: Db): Promise<void> {
  await db.collection('refresh_tokens').drop();
  console.log('Dropped refresh_tokens collection');
}