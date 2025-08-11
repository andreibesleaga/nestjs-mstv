import { MongoClient, Db } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

class SeedRunner {
  private client: MongoClient;
  private db: Db;

  constructor(connectionString: string) {
    this.client = new MongoClient(connectionString);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db('nestjs-app');
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async runSeeds(): Promise<void> {
    const seedsDir = path.join(__dirname, 'seeds');
    const seedFiles = fs.readdirSync(seedsDir)
      .filter(file => file.endsWith('.seed.ts'))
      .sort();

    for (const file of seedFiles) {
      console.log(`🌱 Running seed: ${file}`);
      
      const seedPath = path.join(seedsDir, file);
      const seedModule = require(seedPath);
      
      await seedModule.seed(this.db);
      
      console.log(`✅ Seed completed: ${file}`);
    }
  }
}

async function main() {
  const connectionString = process.env.MONGODB_URL || 'mongodb://localhost:27017';
  const runner = new SeedRunner(connectionString);

  try {
    await runner.connect();
    await runner.runSeeds();
    console.log('🎉 All seeds completed successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await runner.disconnect();
  }
}

if (require.main === module) {
  main();
}