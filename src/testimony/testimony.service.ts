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
    // Allow anonymous submissions (userId can be null)
    if (userId !== null && userId <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    // Validate that agreedToTerms is true
    if (!createTestimonyDto.agreedToTerms) {
      throw new BadRequestException('You must agree to the terms and conditions');
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
    } catch (error: any) {
      console.error('Error creating testimony:', error);
      if (error.code === 'P2003') {
        throw new BadRequestException('Invalid user ID');
      }
      throw new InternalServerErrorException('Failed to create testimony');
    }
  }

  async findAll(filters?: {
    submissionType?: string;
    status?: string;
    userId?: number;
    isPublished?: boolean;
  }) {
    try {
      const where: any = {};

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

      const testimonies = await this.prisma.testimony.findMany({
        where,
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return testimonies;
    } catch (error) {
      console.error('Error fetching testimonies:', error);
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
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!testimony) {
        throw new NotFoundException('Testimony not found');
      }

      return testimony;
    } catch (error: any) {
      if (error.status === 404) {
        throw error;
      }
      console.error('Error fetching testimony:', error);
      throw new InternalServerErrorException('Failed to fetch testimony');
    }
  }

  async incrementImpression(id: number) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    try {
      const testimony = await this.prisma.testimony.update({
        where: { id },
        data: {
          impressions: {
            increment: 1,
          },
        },
        select: {
          id: true,
          impressions: true,
        },
      });

      return testimony;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Testimony not found');
      }
      console.error('Error incrementing impression:', error);
      throw new InternalServerErrorException('Failed to increment impression');
    }
  }

  async getImpressions(id: number) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    try {
      const testimony = await this.prisma.testimony.findUnique({
        where: { id },
        select: {
          id: true,
          impressions: true,
          eventTitle: true,
        },
      });

      if (!testimony) {
        throw new NotFoundException('Testimony not found');
      }

      return testimony;
    } catch (error: any) {
      if (error.status === 404) {
        throw error;
      }
      console.error('Error fetching impressions:', error);
      throw new InternalServerErrorException('Failed to fetch impressions');
    }
  }

  async update(id: number, userId: number, updateTestimonyDto: UpdateTestimonyDto) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    if (!userId || userId <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    // Check if testimony exists and belongs to user
    const existingTestimony = await this.findOne(id);

    if (existingTestimony.userId !== userId) {
      throw new ForbiddenException('You can only update your own testimonies');
    }

    try {
      const { images, ...testimonyData } = updateTestimonyDto;

      // If images are provided, delete old ones and create new ones
      const updateData: any = { ...testimonyData };

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
    } catch (error: any) {
      if (error.code === 'P2025') {
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

    // Check if testimony exists and belongs to user
    const existingTestimony = await this.findOne(id);

    if (existingTestimony.userId !== userId) {
      throw new ForbiddenException('You can only delete your own testimonies');
    }

    try {
      await this.prisma.testimony.delete({
        where: { id },
      });

      return { message: 'Testimony deleted successfully' };
    } catch (error: any) {
      if (error.code === 'P2025') {
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

  async updateStatus(id: number, status: string) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status. Must be pending, approved, or rejected');
    }

    try {
      const testimony = await this.prisma.testimony.update({
        where: { id },
        data: { status },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return testimony;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Testimony not found');
      }
      console.error('Error updating testimony status:', error);
      throw new InternalServerErrorException('Failed to update testimony status');
    }
  }

  async togglePublish(id: number, userId: number) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    const existingTestimony = await this.findOne(id);

    if (existingTestimony.userId !== userId) {
      throw new ForbiddenException('You can only publish/unpublish your own testimonies');
    }

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
    } catch (error: any) {
      if (error.code === 'P2025') {
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
    } catch (error: any) {
      if (error.code === 'P2025') {
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
    } catch (error: any) {
      if (error.code === 'P2025') {
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
    } catch (error: any) {
      if (error.code === 'P2025') {
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
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Testimony not found');
      }
      console.error('Error requesting feedback:', error);
      throw new InternalServerErrorException('Failed to request feedback');
    }
  }
}
