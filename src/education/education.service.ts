import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEducationDto, ContentType, ContentStatus } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';

@Injectable()
export class EducationService {
  constructor(private prisma: PrismaService) { }

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
        views: 0,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        simulations: true,
        _count: {
          select: {
            userProgress: true,
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
          _count: {
            select: {
              userProgress: true,
            },
          },
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

  async findOne(id: number, userId?: number) {
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
        _count: {
          select: {
            userProgress: true,
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundException('Educational content not found');
    }

    // Check if user has completed this content
    let isCompleted = false;
    if (userId) {
      const userProgress = await this.prisma.userProgress.findFirst({
        where: {
          userId,
          educationId: id,
          contentType: 'education',
        },
      });
      isCompleted = !!userProgress?.isCompleted;
    }

    return {
      ...content,
      isCompleted,
    };
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
        _count: {
          select: {
            userProgress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

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
        _count: {
          select: {
            userProgress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

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
        _count: {
          select: {
            userProgress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPopularContent(limit: number = 10, currentUserId?: number) {
    const popularContent = await this.prisma.educationalContent.findMany({
      where: {
        isPublished: true,
        status: ContentStatus.PUBLISHED,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            userProgress: true,
          },
        },
      },
      orderBy: [
        { views: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    // Add completion status for current user if provided
    if (currentUserId) {
      const contentWithProgress = await Promise.all(
        popularContent.map(async (content) => {
          const userProgress = await this.prisma.userProgress.findFirst({
            where: {
              userId: currentUserId,
              educationId: content.id,
              contentType: 'education',
            },
          });

          return {
            ...content,
            isCompleted: !!userProgress?.isCompleted,
          };
        })
      );

      return contentWithProgress;
    }

    return popularContent;
  }

 
  async getContentStatistics() {
    try {
      const [
        totalContent,
        publishedContent,
        draftContent,
        totalViews,
        mostViewedContent,
        contentByType,
        contentByCategory,
        totalUserProgress,
      ] = await Promise.all([
        this.prisma.educationalContent.count(),
        this.prisma.educationalContent.count({
          where: {
            isPublished: true,
            status: ContentStatus.PUBLISHED,
          },
        }),
        this.prisma.educationalContent.count({
          where: {
            status: ContentStatus.DRAFT,
          },
        }),
        this.prisma.educationalContent.aggregate({
          _sum: {
            views: true,
          },
        }),
        this.prisma.educationalContent.findFirst({
          where: {
            isPublished: true,
          },
          orderBy: {
            views: 'desc',
          },
          include: {
            user: {
              select: {
                fullName: true,
              },
            },
          },
        }),
        this.prisma.educationalContent.groupBy({
          by: ['type'],
          _count: {
            id: true,
          },
          where: {
            isPublished: true,
          },
        }),
        this.prisma.educationalContent.groupBy({
          by: ['category'],
          _count: {
            id: true,
          },
          where: {
            isPublished: true,
          },
        }),
        this.prisma.userProgress.count({
          where: {
            contentType: 'education',
          },
        }),
      ]);

      // Create properly typed objects with null safety
      const contentByTypeObj: Record<string, number> = {};
      contentByType.forEach(item => {
        contentByTypeObj[item.type] = item._count.id;
      });

      const contentByCategoryObj: Record<string, number> = {};
      contentByCategory.forEach(item => {
        const categoryKey = item.category || 'uncategorized';
        contentByCategoryObj[categoryKey] = item._count.id;
      });

      return {
        totalContent,
        publishedContent,
        draftContent,
        totalViews: totalViews._sum?.views || 0,
        mostViewedContent: mostViewedContent ? {
          id: mostViewedContent.id,
          title: mostViewedContent.title,
          views: mostViewedContent.views,
          author: mostViewedContent.user?.fullName || 'Unknown',
        } : null,
        contentByType: contentByTypeObj,
        contentByCategory: contentByCategoryObj,
        totalUserProgress,
      };
    } catch (error) {
      console.error('Error getting content statistics:', error);
      throw new BadRequestException('Failed to retrieve content statistics');
    }
  }

  async incrementViews(id: number): Promise<void> {
    await this.prisma.educationalContent.update({
      where: { id },
      data: {
        views: {
          increment: 1,
        },
      },
    });
  }

  async trackUserProgress(userId: number, contentId: number, completed: boolean = true) {
    const content = await this.findOne(contentId);

    if (!content.isPublished || content.status !== ContentStatus.PUBLISHED) {
      throw new BadRequestException('Cannot track progress for unpublished content');
    }

    return this.prisma.userProgress.upsert({
      where: {
        userId_educationId: {
          userId,
          educationId: contentId,
        },
      },
      update: {
        isCompleted: completed,
        progress: completed ? 1.0 : 0.5,
        completedAt: completed ? new Date() : null,
        lastAccessedAt: new Date(),
      },
      create: {
        userId,
        educationId: contentId,
        contentType: 'education',
        isCompleted: completed,
        progress: completed ? 1.0 : 0.5,
        completedAt: completed ? new Date() : null,
        lastAccessedAt: new Date(),
      },
    });
  }

  async getUserLearningProgress(userId: number) {
    const [totalContent, completedContent, inProgressContent] = await Promise.all([
      this.prisma.educationalContent.count({
        where: {
          isPublished: true,
          status: ContentStatus.PUBLISHED,
        },
      }),
      this.prisma.userProgress.count({
        where: {
          userId,
          contentType: 'education',
          isCompleted: true,
        },
      }),
      this.prisma.userProgress.count({
        where: {
          userId,
          contentType: 'education',
          isCompleted: false,
        },
      }),
    ]);

    const progressPercentage = totalContent > 0 ? Math.round((completedContent / totalContent) * 100) : 0;

    return {
      totalContent,
      completedContent,
      inProgressContent,
      progressPercentage,
    };
  }
}