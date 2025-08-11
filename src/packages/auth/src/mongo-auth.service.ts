import { Injectable, Logger } from '@nestjs/common';
import { Collection } from 'mongodb';
import { MongoDbService } from '../../../common/mongodb.service';
import * as bcrypt from 'bcrypt';

interface RefreshTokenDocument {
  _id?: string;
  token: string;
  userId: string;
  revoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MongoAuthService {
  private readonly logger = new Logger(MongoAuthService.name);
  private refreshTokens: Collection<RefreshTokenDocument>;

  constructor(private readonly mongoService: MongoDbService) {
    this.refreshTokens = this.mongoService.getDb().collection<RefreshTokenDocument>('refresh_tokens');
  }

  async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshTokenDocument> {
    const refreshToken: RefreshTokenDocument = {
      _id: new Date().getTime().toString(),
      token,
      userId,
      revoked: false,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.refreshTokens.insertOne(refreshToken);
    return refreshToken;
  }

  async findRefreshToken(token: string): Promise<RefreshTokenDocument | null> {
    return await this.refreshTokens.findOne({ token, revoked: false });
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokens.updateOne(
      { token },
      { 
        $set: { 
          revoked: true, 
          updatedAt: new Date() 
        } 
      }
    );
  }

  async cleanupExpiredTokens(): Promise<void> {
    const result = await this.refreshTokens.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    if (result.deletedCount > 0) {
      this.logger.log(`Cleaned up ${result.deletedCount} expired refresh tokens`);
    }
  }
}