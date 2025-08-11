import { Db } from 'mongodb';

export async function up(db: Db): Promise<void> {
  // Create users collection with indexes
  await db.createCollection('users');
  
  // Create unique index on email
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  
  // Create index on role for faster queries
  await db.collection('users').createIndex({ role: 1 });
  
  // Create compound index for common queries
  await db.collection('users').createIndex({ email: 1, role: 1 });
  
  console.log('Created users collection with indexes');
}

export async function down(db: Db): Promise<void> {
  await db.collection('users').drop();
  console.log('Dropped users collection');
}