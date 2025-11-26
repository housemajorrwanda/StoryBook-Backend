import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEducationDto, ContentType, ContentStatus } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';

@Injectable()
export class EducationService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateEducationDto) {
    return this.prisma.educationalContent.create({
      data: {
        title: dto.title,
        description: dto.description,
        content: dto.content,
        type: dto.type,
        imageUrl: dto.imageUrl,
        videoUrl: dto.videoUrl,
        duration: dto.duration,
        category: dto.category,
        tags: dto.tags || [],
        status: dto.status || ContentStatus.DRAFT,
        isPublished: dto.isPublished || false,
        userId: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(filters: {
    skip?: number;
    limit?: number;
    search?: string;
    type?: ContentType;
    category?: string;
    status?: ContentStatus;
    isPublished?: boolean;
  } = {}) {
    const { skip = 0, limit = 10, search, type, category, status, isPublished } = filters;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) where.type = type;
    if (category) where.category = category;
    if (status) where.status = status;
    if (isPublished !== undefined) where.isPublished = isPublished;

    const [data, total] = await Promise.all([
      this.prisma.educationalContent.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          simulations: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.educationalContent.count({ where }),
    ]);

    return {
      data,
      meta: {
        skip,
        limit,
        total,
      },
    };
  }

  async findOne(id: number) {
    const content = await this.prisma.educationalContent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        simulations: true,
      },
    });

    if (!content) {
      throw new NotFoundException('Educational content not found');
    }

    return content;
  }

  async update(id: number, userId: number, dto: UpdateEducationDto) {
    const content = await this.findOne(id);

    // Check ownership (users can only update their own content, admins can update any)
    if (content.userId !== userId) {
      throw new ForbiddenException('You can only update your own educational content');
    }

    return this.prisma.educationalContent.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        content: dto.content,
        type: dto.type,
        imageUrl: dto.imageUrl,
        videoUrl: dto.videoUrl,
        duration: dto.duration,
        category: dto.category,
        tags: dto.tags,
        status: dto.status,
        isPublished: dto.isPublished,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: number, userId: number) {
    const content = await this.findOne(id);

    // Check ownership
    if (content.userId !== userId) {
      throw new ForbiddenException('You can only delete your own educational content');
    }

    return this.prisma.educationalContent.delete({
      where: { id },
    });
  }

  async findUserContent(userId: number) {
    return this.prisma.educationalContent.findMany({
      where: { userId },
      include: {
        simulations: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // New method to get content by category
  async findByCategory(category: string) {
    return this.prisma.educationalContent.findMany({
      where: { 
        category,
        isPublished: true,
        status: ContentStatus.PUBLISHED
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // New method to get published content only
  async findPublished(filters: { skip?: number; limit?: number; search?: string } = {}) {
    const { skip = 0, limit = 10, search } = filters;

    const where: any = {
      isPublished: true,
      status: ContentStatus.PUBLISHED,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.educationalContent.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}