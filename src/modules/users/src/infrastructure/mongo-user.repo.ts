import { Injectable, Logger } from '@nestjs/common';
import { Collection, ObjectId } from 'mongodb';
import { IUserRepository } from '../../../../packages/packs/src/repositories/user.repository';
import { User } from '../domain/user.entity';
import { MongoDbService } from '../../../../common/mongodb.service';

interface UserDocument {
  _id?: ObjectId | string;
  email: string;
  name?: string;
  password?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MongoUserRepo implements IUserRepository {
  private readonly logger = new Logger(MongoUserRepo.name);
  private users: Collection<UserDocument>;

  constructor(private readonly mongoService: MongoDbService) {
    this.users = this.mongoService.getDb().collection<UserDocument>('users');
  }

  async findById(id: string): Promise<User | null> {
    try {
      const user = await this.users.findOne({ _id: id as any });
      return user ? this.mapToUser(user) : null;
    } catch (error) {
      this.logger.error(`Failed to find user by id ${id}:`, error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.users.findOne({ email });
      return user ? this.mapToUser(user) : null;
    } catch (error) {
      this.logger.error(`Failed to find user by email:`, error);
      throw error;
    }
  }

  async create(userData: Partial<User>): Promise<User> {
    try {
      const doc: UserDocument = {
        _id: userData.id || new Date().getTime().toString(),
        email: userData.email?.getValue() || '',
        name: userData.name,
        password: userData.password?.getValue(),
        role: userData.role || 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await this.users.insertOne(doc);
      return this.mapToUser(doc);
    } catch (error) {
      this.logger.error('Failed to create user:', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    try {
      const updateData: Partial<UserDocument> = { updatedAt: new Date() };
      if (data.email) updateData.email = data.email.getValue();
      if (data.name !== undefined) updateData.name = data.name;
      if (data.password) updateData.password = data.password.getValue();
      if (data.role) updateData.role = data.role;

      await this.users.updateOne({ _id: id as any }, { $set: updateData });
      const updated = await this.users.findOne({ _id: id as any });
      return this.mapToUser(updated!);
    } catch (error) {
      this.logger.error(`Failed to update user ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.users.deleteOne({ _id: id as any });
    } catch (error) {
      this.logger.error(`Failed to delete user ${id}:`, error);
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    try {
      const users = await this.users.find({}).toArray();
      return users.map(user => this.mapToUser(user));
    } catch (error) {
      this.logger.error('Failed to find all users:', error);
      throw error;
    }
  }

  private mapToUser(doc: UserDocument): User {
    return new User({
      id: doc._id?.toString() || '',
      email: doc.email,
      name: doc.name,
      password: doc.password,
      role: doc.role,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}