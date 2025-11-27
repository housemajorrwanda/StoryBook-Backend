import { PrismaService } from '../prisma/prisma.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { UpdateSimulationDto } from './dto/update-simulation.dto';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class SimulationService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateSimulationDto) {
    // Check if educational content exists if provided
    if (dto.educationId) {
      const education = await this.prisma.educationalContent.findUnique({
        where: { id: dto.educationId },
      });
      if (!education) {
        throw new NotFoundException('Educational content not found');
      }
      // Optional: Check if user owns the educational content or has permission
      if (education.userId && education.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to associate this educational content',
        );
      }
    }

    return this.prisma.scenarioSimulation.create({
      data: {
        title: dto.title,
        description: dto.description,
        scenario: dto.scenario,
        simulationType: dto.simulationType,
        backgroundImage: dto.backgroundImage,
        educationId: dto.educationId,
        status: dto.status || 'draft',
        isPublished: dto.isPublished || false,
      },
      include: {
        educationalContent: true,
        userProgress: false, // Include if needed for response
      },
    });
  }

  async findAll(
    filters: {
      simulationType?: string;
      status?: string;
      isPublished?: boolean;
      educationId?: number;
      skip?: number;
      limit?: number;
    } = {},
  ) {
    const {
      simulationType,
      status,
      isPublished,
      educationId,
      skip = 0,
      limit = 10,
    } = filters;

    const where: any = {};

    if (simulationType) where.simulationType = simulationType;
    if (status) where.status = status;
    if (isPublished !== undefined) where.isPublished = isPublished;
    if (educationId) where.educationId = educationId;

    const [data, total] = await Promise.all([
      this.prisma.scenarioSimulation.findMany({
        where,
        skip,
        take: limit,
        include: {
          educationalContent: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.scenarioSimulation.count({ where }),
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
    const simulation = await this.prisma.scenarioSimulation.findUnique({
      where: { id },
      include: {
        educationalContent: true,
        userProgress: {
          select: {
            id: true,
            userId: true,
            progress: true,
            isCompleted: true,
          },
        },
      },
    });

    if (!simulation) {
      throw new NotFoundException('Simulation not found');
    }

    return simulation;
  }

  async update(id: number, userId: number, dto: UpdateSimulationDto) {
    const existingSimulation = await this.findOne(id);

    // Optional: Permission check (e.g., if linked to user-owned content)
    if (
      existingSimulation.educationalContent?.userId &&
      existingSimulation.educationalContent.userId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to update this simulation',
      );
    }

    const data: any = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.scenario !== undefined) data.scenario = dto.scenario;
    if (dto.simulationType !== undefined)
      data.simulationType = dto.simulationType;
    if (dto.backgroundImage !== undefined)
      data.backgroundImage = dto.backgroundImage;
    if (dto.educationId !== undefined) {
      // Validate new educationId if changing
      if (dto.educationId !== existingSimulation.educationId) {
        const education = await this.prisma.educationalContent.findUnique({
          where: { id: dto.educationId },
        });
        if (!education) {
          throw new NotFoundException('Educational content not found');
        }
      }
      data.educationId = dto.educationId;
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;

    return this.prisma.scenarioSimulation.update({
      where: { id },
      data,
      include: {
        educationalContent: true,
      },
    });
  }

  async delete(id: number, userId: number) {
    const existingSimulation = await this.findOne(id);

    // Optional: Permission check
    if (
      existingSimulation.educationalContent?.userId &&
      existingSimulation.educationalContent.userId !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this simulation',
      );
    }

    // Consider cascading deletes or handling relations (e.g., userProgress)
    return this.prisma.scenarioSimulation.delete({
      where: { id },
    });
  }

  async publish(id: number, userId: number) {
    return this.update(id, userId, { isPublished: true, status: 'published' });
  }

  async unpublish(id: number, userId: number) {
    return this.update(id, userId, { isPublished: false, status: 'draft' });
  }

  async getStatistics(educationId?: number) {
    const where: any = {};
    if (educationId) where.educationId = educationId;

    const [total, published, draft, progressStats] = await Promise.all([
      this.prisma.scenarioSimulation.count({ where }),
      this.prisma.scenarioSimulation.count({
        where: { ...where, isPublished: true },
      }),
      this.prisma.scenarioSimulation.count({
        where: { ...where, status: 'draft' },
      }),
      this.prisma.userProgress.aggregate({
        where: {
          simulationId: { not: null },
          ...(educationId ? { educational: { id: educationId } } : {}),
        },
        _avg: { progress: true },
        _count: { id: true },
      }),
    ]);

    return {
      total,
      published,
      draft,
      averageProgress: progressStats._avg.progress || 0,
      totalUserInteractions: progressStats._count.id,
    };
  }
}
