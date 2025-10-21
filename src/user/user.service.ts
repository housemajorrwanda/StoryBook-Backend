import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from './user.types';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(userData: Partial<User>): Promise<User> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          { username: userData.username }
        ]
      }
    });

    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }

    if (!userData.password) {
      throw new Error('Password is required');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    return this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      } as any,
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username }
        ]
      }
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        password: false
      }
    });
    return users as unknown as User[];
  }

  async update(id: number, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const dataToUpdate = { ...updateData };
    if (updateData.password) {
      dataToUpdate.password = await bcrypt.hash(updateData.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: dataToUpdate as any
    });
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }
}
