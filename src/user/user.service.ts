/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// Force TypeScript recheck
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from './user.types';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(userData: Partial<User>): Promise<User> {
    if (!userData.email) {
      throw new BadRequestException('Email is required');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: userData.email,
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    let hashedPassword: string | null = null;
    if (userData.password) {
      hashedPassword = await bcrypt.hash(userData.password, 10);
    }

    try {
      return await this.prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
        } as any,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    if (!email || email.trim() === '') {
      return null;
    }

    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: number): Promise<User | null> {
    if (!id || id <= 0) {
      return null;
    }

    return this.prisma.user.findUnique({ where: { id } });
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async findAll(options?: {
    skip?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    data: User[];
    total: number;
    skip: number;
    limit: number;
  }> {
    const rawSkip = options?.skip ?? 0;
    const rawLimit = options?.limit ?? 20;
    const skip = Number.isFinite(rawSkip) && rawSkip > 0 ? rawSkip : 0;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20;
    const cappedLimit = Math.min(limit, 100);
    const search = options?.search?.trim();

    const where =
      search && search.length > 0
        ? {
            OR: [
              {
                email: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                fullName: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                residentPlace: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : undefined;

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: cappedLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          residentPlace: true,
          isActive: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          password: false,
        },
      }),
    ]);

    return {
      data: users as unknown as User[],
      total,
      skip,
      limit: cappedLimit,
    };
  }

  async update(id: number, updateData: Partial<User>): Promise<User> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const dataToUpdate = { ...updateData };
    if (updateData.password) {
      dataToUpdate.password = await bcrypt.hash(updateData.password, 10);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: dataToUpdate as any,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('User with this email already exists');
      }
      console.error('Error updating user:', error);
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async remove(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete user due to existing related records',
        );
      }
      console.error('Error deleting user:', error);
      throw new InternalServerErrorException('Failed to delete user');
    }
  }

  async findByResetToken(resetToken: string): Promise<User | null> {
    if (!resetToken || resetToken.trim() === '') {
      return null;
    }

    return this.prisma.user.findUnique({ where: { resetToken } as any });
  }

  async updateResetToken(
    id: number,
    resetToken: string,
    resetTokenExpiry: Date,
  ): Promise<void> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          resetToken,
          resetTokenExpiry,
        } as any,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      console.error('Error updating reset token:', error);
      throw new InternalServerErrorException('Failed to update reset token');
    }
  }

  async updatePassword(id: number, newPassword: string): Promise<void> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    if (!newPassword || newPassword.trim() === '') {
      throw new BadRequestException('Password cannot be empty');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          password: hashedPassword,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      console.error('Error updating password:', error);
      throw new InternalServerErrorException('Failed to update password');
    }
  }

  async clearResetToken(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        } as any,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      console.error('Error clearing reset token:', error);
      throw new InternalServerErrorException('Failed to clear reset token');
    }
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    if (!googleId || googleId.trim() === '') {
      return null;
    }

    return this.prisma.user.findUnique({ where: { googleId } as any });
  }

  async createGoogleUser(userData: {
    email: string;
    fullName?: string;
    googleId: string;
    avatar?: string;
    provider: string;
  }): Promise<User> {
    if (!userData.email || !userData.googleId) {
      throw new BadRequestException('Email and Google ID are required');
    }

    try {
      return await this.prisma.user.create({
        data: {
          ...userData,
          isActive: true,
        } as any,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('User with this email already exists');
      }
      console.error('Error creating Google user:', error);
      throw new InternalServerErrorException('Failed to create Google user');
    }
  }

  async linkGoogleAccount(
    userId: number,
    googleId: string,
    avatar?: string,
  ): Promise<void> {
    if (!userId || userId <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    if (!googleId || googleId.trim() === '') {
      throw new BadRequestException('Google ID is required');
    }

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleId,
          avatar,
          provider: 'google',
        } as any,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      if (error.code === 'P2002') {
        throw new ConflictException(
          'This Google account is already linked to another user',
        );
      }
      console.error('Error linking Google account:', error);
      throw new InternalServerErrorException('Failed to link Google account');
    }
  }
}
