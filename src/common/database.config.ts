import { Injectable } from '@nestjs/common';

export type DatabaseType = 'postgresql' | 'mongodb' | 'mysql' | 'mariadb';

@Injectable()
export class DatabaseConfig {
  static getDatabaseType(): DatabaseType {
    return (process.env.DATABASE_TYPE as DatabaseType) || 'postgresql';
  }

  static getConnectionString(): string {
    const dbType = this.getDatabaseType();

    if (dbType === 'mongodb') {
      return process.env.MONGODB_URL || 'mongodb://localhost:27017/nestjs-app';
    }
    if (dbType === 'mysql' || dbType === 'mariadb') {
      return (
        process.env.MYSQL_URL || process.env.DATABASE_URL || 'mysql://dev:dev@localhost:3306/dev'
      );
    }

    return process.env.DATABASE_URL || 'postgresql://dev:dev@localhost:5432/dev';
  }

  static isMongoDb(): boolean {
    return this.getDatabaseType() === 'mongodb';
  }

  static isPostgreSQL(): boolean {
    return this.getDatabaseType() === 'postgresql';
  }

  static isMySQL(): boolean {
    const t = this.getDatabaseType();
    return t === 'mysql' || t === 'mariadb';
  }
}
