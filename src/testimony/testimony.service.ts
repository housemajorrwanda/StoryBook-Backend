import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestimonyDto } from './dto/create-testimony.dto';
import { UpdateTestimonyDto } from './dto/update-testimony.dto';

@Injectable()
export class TestimonyService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number | null, createTestimonyDto: CreateTestimonyDto) {
    if (userId !== null && userId <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    // Validate that agreedToTerms is true
    if (!createTestimonyDto.agreedToTerms) {
      throw new BadRequestException(
        'You must agree to the terms and conditions',
      );
    }

    try {
      const { images, ...testimonyData } = createTestimonyDto;

      const testimony = await this.prisma.testimony.create({
        data: {
          ...testimonyData,
          userId,
          images: images?.length
            ? {
                create: images.map((img, index) => ({
                  imageUrl: img.imageUrl,
                  imageFileName: img.imageFileName,
                  description: img.description,
                  order: img.order ?? index,
                })),
              }
            : undefined,
        },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return testimony;
    } catch (error: unknown) {
      console.error('Error creating testimony:', error);

      // Re-throw HTTP exceptions (like BadRequestException from validation)
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      // Handle Prisma errors
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2003') {
          throw new BadRequestException(
            'Invalid user ID - user does not exist',
          );
        }
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'A testimony with this data already exists',
          );
        }
      }

      // Log the actual error for debugging
      if (error instanceof Error) {
        console.error(
          'Unexpected error creating testimony:',
          error.message,
          error.stack,
        );
      } else {
        console.error('Unexpected error creating testimony:', error);
      }
      throw new InternalServerErrorException(
        'Failed to create testimony. Please check your input and try again.',
      );
    }
  }

  async findAll(filters?: {
    skip?: number;
    limit?: number;
    search?: string;
    submissionType?: string;
    status?: string;
    userId?: number;
    isPublished?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }) {
    try {
      const skip = filters?.skip ?? 0;
      const limit = filters?.limit ?? 10;

      const where: {
        submissionType?: string;
        status?: string;
        userId?: number;
        isPublished?: boolean;
        createdAt?: { gte?: Date; lte?: Date };
        OR?: Array<{
          eventTitle?: { contains: string; mode: 'insensitive' };
          eventDescription?: { contains: string; mode: 'insensitive' };
          fullName?: { contains: string; mode: 'insensitive' };
        }>;
      } = {};

      // Apply filters from query parameters
      if (filters?.submissionType) {
        where.submissionType = filters.submissionType;
      }

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.userId) {
        where.userId = filters.userId;
      }

      if (filters?.isPublished !== undefined) {
        where.isPublished = filters.isPublished;
      }

      // Search filter - search in eventTitle, eventDescription, or fullName
      if (filters?.search) {
        where.OR = [
          { eventTitle: { contains: filters.search, mode: 'insensitive' } },
          {
            eventDescription: { contains: filters.search, mode: 'insensitive' },
          },
          { fullName: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Date range filters
      if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters?.dateFrom) {
          where.createdAt.gte = new Date(filters.dateFrom);
        }
        if (filters?.dateTo) {
          where.createdAt.lte = new Date(filters.dateTo);
        }
      }

      const [testimonies, total] = await Promise.all([
        this.prisma.testimony.findMany({
          where,
          include: {
            images: {
              orderBy: { order: 'asc' },
            },
            user: {
              select: {
                id: true,
                fullName: true,
                residentPlace: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.testimony.count({ where }),
      ]);

      return {
        data: testimonies,
        meta: {
          skip,
          limit,
          total,
        },
      };
    } catch (error: unknown) {
      console.error('Error fetching testimonies:', error);

      // Re-throw HTTP exceptions
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      if (error instanceof Error) {
        console.error('Unexpected error fetching testimonies:', error.message);
      }
      throw new InternalServerErrorException('Failed to fetch testimonies');
    }
  }

  async findOne(id: number) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    try {
      const testimony = await this.prisma.testimony.findUnique({
        where: { id },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              residentPlace: true,
            },
          },
        },
      });

      if (!testimony) {
        throw new NotFoundException('Testimony not found');
      }

      // Automatically increment impression count when viewing a testimony
      await this.prisma.testimony.update({
        where: { id },
        data: {
          impressions: {
            increment: 1,
          },
        },
      });

      // Return testimony with updated impression count
      return {
        ...testimony,
        impressions: testimony.impressions + 1,
      };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        error.status === 404
      ) {
        throw error;
      }
      console.error('Error fetching testimony:', error);
      throw new InternalServerErrorException('Failed to fetch testimony');
    }
  }

  async update(
    id: number,
    userId: number,
    updateTestimonyDto: UpdateTestimonyDto,
  ) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    if (!userId || userId <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    const existingTestimony = await this.findOne(id);

    if (existingTestimony.userId !== userId) {
      throw new ForbiddenException('You can only update your own testimonies');
    }

    try {
      const { images, ...testimonyData } = updateTestimonyDto;

      const updateData: Record<string, unknown> = { ...testimonyData };

      if (images !== undefined) {
        updateData.images = {
          deleteMany: {},
          create: images.map((img, index) => ({
            imageUrl: img.imageUrl,
            imageFileName: img.imageFileName,
            description: img.description,
            order: img.order ?? index,
          })),
        };
      }

      const testimony = await this.prisma.testimony.update({
        where: { id },
        data: updateData,
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return testimony;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Testimony not found');
      }
      console.error('Error updating testimony:', error);
      throw new InternalServerErrorException('Failed to update testimony');
    }
  }

  async remove(id: number, userId: number) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    if (!userId || userId <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    const existingTestimony = await this.findOne(id);

    if (existingTestimony.userId !== userId) {
      throw new ForbiddenException('You can only delete your own testimonies');
    }

    try {
      await this.prisma.testimony.delete({
        where: { id },
      });

      return { message: 'Testimony deleted successfully' };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Testimony not found');
      }
      console.error('Error deleting testimony:', error);
      throw new InternalServerErrorException('Failed to delete testimony');
    }
  }

  async findUserTestimonies(userId: number) {
    if (!userId || userId <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.findAll({ userId });
  }

  async updateStatus(id: number, status: string, adminId: number) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        'Invalid status. Must be pending, approved, or rejected',
      );
    }

    try {
      const testimony = await this.prisma.testimony.update({
        where: { id },
        data: {
          status,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return testimony;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Testimony not found');
      }
      console.error('Error updating testimony status:', error);
      throw new InternalServerErrorException(
        'Failed to update testimony status',
      );
    }
  }

  async togglePublish(id: number) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    const existingTestimony = await this.findOne(id);

    try {
      const testimony = await this.prisma.testimony.update({
        where: { id },
        data: { isPublished: !existingTestimony.isPublished },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return testimony;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Testimony not found');
      }
      console.error('Error toggling publish status:', error);
      throw new InternalServerErrorException('Failed to toggle publish status');
    }
  }

  async approveTestimony(id: number, adminId: number, feedback?: string) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    if (!adminId || adminId <= 0) {
      throw new BadRequestException('Invalid admin ID');
    }

    try {
      const testimony = await this.prisma.testimony.update({
        where: { id },
        data: {
          status: 'approved',
          adminFeedback: feedback,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return testimony;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Testimony not found');
      }
      console.error('Error approving testimony:', error);
      throw new InternalServerErrorException('Failed to approve testimony');
    }
  }

  async rejectTestimony(id: number, adminId: number, reason: string) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    try {
      const testimony = await this.prisma.testimony.update({
        where: { id },
        data: {
          status: 'rejected',
          adminFeedback: reason,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return testimony;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Testimony not found');
      }
      console.error('Error rejecting testimony:', error);
      throw new InternalServerErrorException('Failed to reject testimony');
    }
  }

  async reportTestimony(id: number, adminId: number, reason: string) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Report reason is required');
    }

    try {
      const testimony = await this.prisma.testimony.update({
        where: { id },
        data: {
          status: 'reported',
          reportReason: reason,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return testimony;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Testimony not found');
      }
      console.error('Error reporting testimony:', error);
      throw new InternalServerErrorException('Failed to report testimony');
    }
  }

  async requestFeedback(id: number, adminId: number, message: string) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    if (!message || message.trim().length === 0) {
      throw new BadRequestException('Feedback message is required');
    }

    try {
      const testimony = await this.prisma.testimony.update({
        where: { id },
        data: {
          status: 'feedback_requested',
          adminFeedback: message,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return testimony;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Testimony not found');
      }
      console.error('Error requesting feedback:', error);
      throw new InternalServerErrorException('Failed to request feedback');
    }
  }
}
