import { MongoClient, Db } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

interface Migration {
  id: string;
  filename: string;
  appliedAt: Date;
}

class MigrationRunner {
  private client: MongoClient;
  private db: Db;

  constructor(connectionString: string) {
    this.client = new MongoClient(connectionString);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db('nestjs-app');
    
    // Ensure migrations collection exists
    await this.db.createCollection('migrations').catch(() => {
      // Collection might already exist
    });
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async getAppliedMigrations(): Promise<Migration[]> {
    return await this.db.collection<Migration>('migrations').find({}).toArray();
  }

  async markMigrationAsApplied(filename: string): Promise<void> {
    await this.db.collection('migrations').insertOne({
      id: filename.replace('.ts', ''),
      filename,
      appliedAt: new Date(),
    });
  }

  async removeMigrationRecord(filename: string): Promise<void> {
    await this.db.collection('migrations').deleteOne({
      filename,
    });
  }

  async runMigrations(): Promise<void> {
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.ts'))
      .sort();

    const appliedMigrations = await this.getAppliedMigrations();
    const appliedFilenames = appliedMigrations.map(m => m.filename);

    for (const file of migrationFiles) {
      if (!appliedFilenames.includes(file)) {
        console.log(`🔄 Running migration: ${file}`);
        
        const migrationPath = path.join(migrationsDir, file);
        const migration = require(migrationPath);
        
        await migration.up(this.db);
        await this.markMigrationAsApplied(file);
        
        console.log(`Migration completed: ${file}`);
      } else {
        console.log(`Migration already applied: ${file}`);
      }
    }
  }

  async rollbackLastMigration(): Promise<void> {
    const appliedMigrations = await this.getAppliedMigrations();
    
    if (appliedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigration = appliedMigrations
      .sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime())[0];

    console.log(`Rolling back migration: ${lastMigration.filename}`);

    const migrationPath = path.join(__dirname, 'migrations', lastMigration.filename);
    const migration = require(migrationPath);

    await migration.down(this.db);
    await this.removeMigrationRecord(lastMigration.filename);

    console.log(`Rollback completed: ${lastMigration.filename}`);
  }
}

async function main() {
  const connectionString = process.env.MONGODB_URL || 'mongodb://localhost:27017';
  const runner = new MigrationRunner(connectionString);

  try {
    await runner.connect();
    
    const command = process.argv[2];
    
    switch (command) {
      case 'up':
        await runner.runMigrations();
        break;
      case 'down':
        await runner.rollbackLastMigration();
        break;
      default:
        console.log('Usage: ts-node migration-runner.ts [up|down]');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await runner.disconnect();
  }
}

if (require.main === module) {
  main();
}