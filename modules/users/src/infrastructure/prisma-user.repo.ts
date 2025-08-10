
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { IUserRepository } from '../../../../packages/packs/src/repositories/user.repository';
import { User } from '../domain/user.entity';

const prisma = new PrismaClient();

@Injectable()
export class PrismaUserRepo implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u) return null;
    return new User(u);
  }

  async findByEmail(email: string): Promise<User | null> {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) return null;
    return new User(u);
  }

  async create(userData: Partial<User>): Promise<User> {
    const u = await prisma.user.create({ 
      data: { 
        id: userData.id!,
        email: userData.email!,
        name: userData.name,
        password: userData.password!,
        role: userData.role
      } 
    });
    return new User(u);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const u = await prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        name: data.name,
        password: data.password,
        role: data.role
      }
    });
    return new User(u);
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    const users = await prisma.user.findMany();
    return users.map(u => new User(u));
  }
}
