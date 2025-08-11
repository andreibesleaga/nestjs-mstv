import { Injectable, Logger } from '@nestjs/common';
import { IUserRepository } from '../../../../packages/packs/src/repositories/user.repository';
import { User } from '../domain/user.entity';
import { PrismaService } from '../../../../common/prisma.service';

@Injectable()
export class PrismaUserRepo implements IUserRepository {
  private readonly logger = new Logger(PrismaUserRepo.name);

  constructor(private readonly prisma: PrismaService) {}
  async findById(id: string): Promise<User | null> {
    try {
      if (!id?.trim()) {
        this.logger.warn('findById called with empty id');
        return null;
      }
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user) return null;
      return new User(user);
    } catch (error) {
      this.logger.error(`Failed to find user by id ${id}:`, error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      if (!email?.trim()) {
        this.logger.warn('findByEmail called with empty email');
        return null;
      }
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) return null;
      return new User(user);
    } catch (error) {
      this.logger.error(`Failed to find user by email:`, error);
      throw error;
    }
  }

  async create(userData: Partial<User>): Promise<User> {
    try {
      if (!userData.email || !userData.password) {
        throw new Error('Email and password are required for user creation');
      }
      const user = await this.prisma.user.create({
        data: {
          id: userData.id || undefined,
          email: userData.email.getValue(),
          name: userData.name,
          password: userData.password.getValue(),
          role: userData.role || 'user',
        },
      });
      this.logger.log(`User created successfully: ${user.id}`);
      return new User(user);
    } catch (error) {
      this.logger.error('Failed to create user:', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    try {
      if (!id?.trim()) {
        throw new Error('User ID is required for update');
      }
      const updateData: any = {};
      if (data.email) updateData.email = data.email.getValue();
      if (data.name !== undefined) updateData.name = data.name;
      if (data.password) updateData.password = data.password.getValue();
      if (data.role) updateData.role = data.role;

      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
      });
      this.logger.log(`User updated successfully: ${user.id}`);
      return new User(user);
    } catch (error) {
      this.logger.error(`Failed to update user ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!id?.trim()) {
        throw new Error('User ID is required for deletion');
      }
      await this.prisma.user.delete({ where: { id } });
      this.logger.log(`User deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete user ${id}:`, error);
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    try {
      const users = await this.prisma.user.findMany();
      return users.map((user) => new User(user));
    } catch (error) {
      this.logger.error('Failed to find all users:', error);
      throw error;
    }
  }
}
