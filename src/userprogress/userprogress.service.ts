import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserprogressDto, ProgressContentType } from './dto/create-userprogress.dto';
import { UpdateUserProgressDto } from './dto/update-userprogress.dto';

@Injectable()
export class UserProgressService {
  constructor(private prisma: PrismaService) { }

  async create(userId: number, dto: CreateUserprogressDto) {
    // Validate that the appropriate content ID is provided based on contentType
    this.validateContentIds(dto);

    // Check if content exists
    await this.validateContentExists(dto);

    // Check for existing progress record
    const existingProgress = await this.findExistingProgress(userId, dto);
    if (existingProgress) {
      throw new BadRequestException('Progress record already exists for this content');
    }

    return this.prisma.userProgress.create({
      data: {
        userId,
        contentType: dto.contentType,
        testimonyId: dto.testimonyId,
        educationId: dto.educationId,
        simulationId: dto.simulationId,
        progress: dto.progress || 0.0,
        isCompleted: dto.isCompleted || false,
        completedAt: dto.isCompleted ? new Date() : null,
        rating: dto.rating,
        feedback: dto.feedback,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        testimony: dto.contentType === ProgressContentType.TESTIMONY ? true : false,
        educational: dto.contentType === ProgressContentType.EDUCATION ? true : false,
        simulation: dto.contentType === ProgressContentType.SIMULATION ? true : false,
      },
    });
  }

  async updateOrCreate(userId: number, dto: CreateUserprogressDto) {
    // Validate that the appropriate content ID is provided based on contentType
    this.validateContentIds(dto);

    // Check if content exists
    await this.validateContentExists(dto);

    // Find existing progress record
    const existingProgress = await this.findExistingProgress(userId, dto);

    if (existingProgress) {
      // Update existing record
      return this.prisma.userProgress.update({
        where: { id: existingProgress.id },
        data: {
          progress: dto.progress !== undefined ? dto.progress : existingProgress.progress,
          isCompleted: dto.isCompleted !== undefined ? dto.isCompleted : existingProgress.isCompleted,
          completedAt: dto.isCompleted ? new Date() : existingProgress.completedAt,
          rating: dto.rating !== undefined ? dto.rating : existingProgress.rating,
          feedback: dto.feedback !== undefined ? dto.feedback : existingProgress.feedback,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          testimony: dto.contentType === ProgressContentType.TESTIMONY ? true : false,
          educational: dto.contentType === ProgressContentType.EDUCATION ? true : false,
          simulation: dto.contentType === ProgressContentType.SIMULATION ? true : false,
        },
      });
    } else {
      // Create new record
      return this.create(userId, dto);
    }
  }

  async findUserProgress(
    userId: number,
    filters: {
      contentType?: ProgressContentType;
      isCompleted?: boolean;
      skip?: number;
      limit?: number;
    } = {},
  ) {
    const { contentType, isCompleted, skip = 0, limit = 10 } = filters;

    const where: any = { userId };

    if (contentType) where.contentType = contentType;
    if (isCompleted !== undefined) where.isCompleted = isCompleted;

    const [data, total] = await Promise.all([
      this.prisma.userProgress.findMany({
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
          testimony: true,
          educational: true,
          simulation: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.userProgress.count({ where }),
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

  async findProgressForContent(
    userId: number,
    contentType: ProgressContentType,
    contentId: number,
  ) {
    const where = this.buildContentWhereClause(userId, contentType, contentId);

    const progress = await this.prisma.userProgress.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        testimony: contentType === ProgressContentType.TESTIMONY ? true : false,
        educational: contentType === ProgressContentType.EDUCATION ? true : false,
        simulation: contentType === ProgressContentType.SIMULATION ? true : false,
      },
    });

    if (!progress) {
      throw new NotFoundException('Progress record not found for this content');
    }

    return progress;
  }

  async findOne(id: number, userId: number) {
    const progress = await this.prisma.userProgress.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        testimony: true,
        educational: true,
        simulation: true,
      },
    });

    if (!progress) {
      throw new NotFoundException('Progress record not found');
    }

    if (progress.userId !== userId) {
      throw new ForbiddenException('You can only access your own progress records');
    }

    return progress;
  }

  async update(id: number, userId: number, updateDto: UpdateUserProgressDto) {
    // Verify the progress record exists and belongs to the user
    const existingProgress = await this.findOne(id, userId);

    const data: any = {
      progress: updateDto.progress,
      isCompleted: updateDto.isCompleted,
      rating: updateDto.rating,
      feedback: updateDto.feedback,
    };

    // Set completedAt if marking as completed
    if (updateDto.isCompleted && !existingProgress.isCompleted) {
      data.completedAt = new Date();
    } else if (!updateDto.isCompleted && existingProgress.isCompleted) {
      data.completedAt = null;
    }

    return this.prisma.userProgress.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        testimony: true,
        educational: true,
        simulation: true,
      },
    });
  }

  async delete(id: number, userId: number) {
    // Verify the progress record exists and belongs to the user
    await this.findOne(id, userId);

    return this.prisma.userProgress.delete({
      where: { id },
    });
  }

  async getUserStatistics(userId: number) {
    const [
      totalProgress,
      completedProgress,
      inProgress,
      averageRating,
      progressByType,
      recentActivity,
    ] = await Promise.all([
      this.prisma.userProgress.count({ where: { userId } }),
      this.prisma.userProgress.count({
        where: {
          userId,
          isCompleted: true,
        },
      }),
      this.prisma.userProgress.count({
        where: {
          userId,
          isCompleted: false,
        },
      }),
      this.prisma.userProgress.aggregate({
        where: {
          userId,
          rating: { not: null },
        },
        _avg: {
          rating: true,
        },
      }),
      this.prisma.userProgress.groupBy({
        by: ['contentType'],
        where: { userId },
        _count: {
          id: true,
        },
        _avg: {
          progress: true,
        },
      }),
      this.prisma.userProgress.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          testimony: true,
          educational: true,
          simulation: true,
        },
      }),
    ]);

    const completionRate = totalProgress > 0 ? (completedProgress / totalProgress) * 100 : 0;

    return {
      totalProgress,
      completedProgress,
      inProgress,
      completionRate: Math.round(completionRate),
      averageRating: averageRating._avg.rating || 0,
      progressByType: progressByType.reduce((acc, item) => {
        acc[item.contentType] = {
          count: item._count.id,
          averageProgress: item._avg.progress || 0,
        };
        return acc;
      }, {}),
      recentActivity,
    };
  }

  // Helper methods
  private validateContentIds(dto: CreateUserprogressDto) {
    switch (dto.contentType) {
      case ProgressContentType.TESTIMONY:
        if (!dto.testimonyId) {
          throw new BadRequestException('testimonyId is required for testimony content type');
        }
        if (dto.educationId !== undefined) {
          throw new BadRequestException('educationId should not be provided for testimony content type');
        }
        if (dto.simulationId !== undefined) {
          throw new BadRequestException('simulationId should not be provided for testimony content type');
        }
        break;
      case ProgressContentType.EDUCATION:
        if (!dto.educationId) {
          throw new BadRequestException('educationId is required for education content type');
        }
        if (dto.testimonyId !== undefined) {
          throw new BadRequestException('testimonyId should not be provided for education content type');
        }
        if (dto.simulationId !== undefined) {
          throw new BadRequestException('simulationId should not be provided for education content type');
        }
        break;
      case ProgressContentType.SIMULATION:
        if (!dto.simulationId) {
          throw new BadRequestException('simulationId is required for simulation content type');
        }
        if (dto.testimonyId !== undefined) {
          throw new BadRequestException('testimonyId should not be provided for simulation content type');
        }
        if (dto.educationId !== undefined) {
          throw new BadRequestException('educationId should not be provided for simulation content type');
        }
        break;
      default:
        throw new BadRequestException(`Invalid content type: ${dto.contentType}`);
    }
  }

  private async validateContentExists(dto: CreateUserprogressDto) {
    switch (dto.contentType) {
      case ProgressContentType.TESTIMONY:
        if (dto.testimonyId) {
          const testimony = await this.prisma.testimony.findUnique({
            where: { id: dto.testimonyId },
          });
          if (!testimony) {
            throw new NotFoundException('Testimony not found');
          }
        }
        break;
      case ProgressContentType.EDUCATION:
        if (dto.educationId) {
          const education = await this.prisma.educationalContent.findUnique({
            where: { id: dto.educationId },
          });
          if (!education) {
            throw new NotFoundException('Educational content not found');
          }
        }
        break;
      case ProgressContentType.SIMULATION:
        if (dto.simulationId) {
          const simulation = await this.prisma.scenarioSimulation.findUnique({
            where: { id: dto.simulationId },
          });
          if (!simulation) {
            throw new NotFoundException('Simulation not found');
          }
        }
        break;
    }
  }

  private async findExistingProgress(userId: number, dto: CreateUserprogressDto) {
    // Get the appropriate content ID based on contentType
    let contentId: number;

    switch (dto.contentType) {
      case ProgressContentType.TESTIMONY:
        contentId = dto.testimonyId!;
        break;
      case ProgressContentType.EDUCATION:
        contentId = dto.educationId!;
        break;
      case ProgressContentType.SIMULATION:
        contentId = dto.simulationId!;
        break;
      default:
        throw new BadRequestException(`Invalid content type: ${dto.contentType}`);
    }

    const where = this.buildContentWhereClause(userId, dto.contentType, contentId);

    return this.prisma.userProgress.findFirst({
      where,
    });
  }

  private buildContentWhereClause(userId: number, contentType: ProgressContentType, contentId: number) {
    const where: any = { userId, contentType };

    switch (contentType) {
      case ProgressContentType.TESTIMONY:
        where.testimonyId = contentId;
        break;
      case ProgressContentType.EDUCATION:
        where.educationId = contentId;
        break;
      case ProgressContentType.SIMULATION:
        where.simulationId = contentId;
        break;
    }

    return where;
  }
}