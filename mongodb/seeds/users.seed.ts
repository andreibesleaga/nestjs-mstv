import { Db } from 'mongodb';
import * as bcrypt from 'bcrypt';

export async function seed(db: Db): Promise<void> {
  const usersCollection = db.collection('users');
  
  // Check if admin user already exists
  const existingAdmin = await usersCollection.findOne({ email: 'admin@example.com' });
  
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('changeme', 10);
    
    await usersCollection.insertOne({
      _id: 'admin-user-id',
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('Created admin user: admin@example.com');
  } else {
    console.log('Admin user already exists');
  }
  
  // Create sample regular user
  const existingUser = await usersCollection.findOne({ email: 'user@example.com' });
  
  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    await usersCollection.insertOne({
      _id: 'regular-user-id',
      email: 'user@example.com',
      name: 'Regular User',
      password: hashedPassword,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('Created regular user: user@example.com');
  } else {
    console.log('Regular user already exists');
  }
}