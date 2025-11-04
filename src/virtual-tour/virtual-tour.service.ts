import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVirtualTourDto } from './dto/create-virtual-tour.dto';
import { UpdateVirtualTourDto } from './dto/update-virtual-tour.dto';

@Injectable()
export class VirtualTourService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, createVirtualTourDto: CreateVirtualTourDto) {
    if (!userId || userId <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    try {
      const { hotspots, audioRegions, effects, ...tourData } =
        createVirtualTourDto;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const created = await this.prisma.virtualTour.create({
        data: {
          ...tourData,
          userId,
          hotspots: hotspots?.length
            ? {
                create: hotspots.map((hotspot, index) => ({
                  ...hotspot,
                  order: hotspot.order ?? index,
                })),
              }
            : undefined,
          audioRegions: audioRegions?.length
            ? {
                create: audioRegions.map((region, index) => ({
                  ...region,
                  order: region.order ?? index,
                })),
              }
            : undefined,
          effects: effects?.length
            ? {
                create: effects.map((effect, index) => ({
                  ...effect,
                  order: effect.order ?? index,
                })),
              }
            : undefined,
        },
        include: {
          hotspots: {
            orderBy: { order: 'asc' },
          },
          audioRegions: {
            orderBy: { order: 'asc' },
          },
          effects: {
            orderBy: { order: 'asc' },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return created;
    } catch (error: unknown) {
      console.error('Error creating virtual tour:', error);

      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2003') {
          throw new BadRequestException(
            'Invalid user ID - user does not exist',
          );
        }
      }

      throw new InternalServerErrorException(
        'Failed to create virtual tour. Please check your input and try again.',
      );
    }
  }

  async findAll(filters?: {
    skip?: number;
    limit?: number;
    search?: string;
    tourType?: string;
    status?: string;
    userId?: number;
    isPublished?: boolean;
  }) {
    try {
      const skip = filters?.skip ?? 0;
      const limit = filters?.limit ?? 10;

      const where: {
        tourType?: string;
        status?: string;
        userId?: number;
        isPublished?: boolean;
        OR?: Array<{
          title?: { contains: string; mode: 'insensitive' };
          description?: { contains: string; mode: 'insensitive' };
          location?: { contains: string; mode: 'insensitive' };
        }>;
      } = {};

      if (filters?.tourType) {
        where.tourType = filters.tourType;
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

      if (filters?.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          {
            description: { contains: filters.search, mode: 'insensitive' },
          },
          { location: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const [tours, total] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        this.prisma.virtualTour.findMany({
          where,
          include: {
            hotspots: {
              orderBy: { order: 'asc' },
            },
            audioRegions: {
              orderBy: { order: 'asc' },
            },
            effects: {
              orderBy: { order: 'asc' },
            },
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        this.prisma.virtualTour.count({ where }),
      ]);

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: tours,
        meta: {
          skip,
          limit,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          total,
        },
      };
    } catch (error: unknown) {
      console.error('Error fetching virtual tours:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      throw new InternalServerErrorException(
        `Failed to fetch virtual tours: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findOne(id: number) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid virtual tour ID');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const tour = await this.prisma.virtualTour.findUnique({
        where: { id },
        include: {
          hotspots: {
            orderBy: { order: 'asc' },
          },
          audioRegions: {
            orderBy: { order: 'asc' },
          },
          effects: {
            orderBy: { order: 'asc' },
          },
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      if (!tour) {
        throw new NotFoundException('Virtual tour not found');
      }

      // Increment impressions
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.prisma.virtualTour.update({
        where: { id },
        data: {
          impressions: {
            increment: 1,
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return {
        ...tour,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        impressions: tour.impressions + 1,
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
      console.error('Error fetching virtual tour:', error);
      throw new InternalServerErrorException('Failed to fetch virtual tour');
    }
  }

  async update(
    id: number,
    userId: number,
    updateVirtualTourDto: UpdateVirtualTourDto,
  ) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid virtual tour ID');
    }

    if (!userId || userId <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const existingTour = await this.prisma.virtualTour.findUnique({
      where: { id },
    });

    if (!existingTour) {
      throw new NotFoundException('Virtual tour not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (existingTour.userId !== userId) {
      throw new ForbiddenException(
        'You can only update your own virtual tours',
      );
    }

    try {
      const { hotspots, audioRegions, effects, ...tourData } =
        updateVirtualTourDto;

      const updateData: Record<string, unknown> = { ...tourData };

      if (hotspots !== undefined) {
        updateData.hotspots = {
          deleteMany: {},
          create: hotspots.map((hotspot, index) => ({
            ...hotspot,
            order: hotspot.order ?? index,
          })),
        };
      }

      if (audioRegions !== undefined) {
        updateData.audioRegions = {
          deleteMany: {},
          create: audioRegions.map((region, index) => ({
            ...region,
            order: region.order ?? index,
          })),
        };
      }

      if (effects !== undefined) {
        updateData.effects = {
          deleteMany: {},
          create: effects.map((effect, index) => ({
            ...effect,
            order: effect.order ?? index,
          })),
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const tour = await this.prisma.virtualTour.update({
        where: { id },
        data: updateData,
        include: {
          hotspots: {
            orderBy: { order: 'asc' },
          },
          audioRegions: {
            orderBy: { order: 'asc' },
          },
          effects: {
            orderBy: { order: 'asc' },
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return tour;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Virtual tour not found');
      }
      console.error('Error updating virtual tour:', error);
      throw new InternalServerErrorException('Failed to update virtual tour');
    }
  }

  async remove(id: number, userId: number) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid virtual tour ID');
    }

    if (!userId || userId <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const existingTour = await this.prisma.virtualTour.findUnique({
      where: { id },
    });

    if (!existingTour) {
      throw new NotFoundException('Virtual tour not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (existingTour.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own virtual tours',
      );
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.prisma.virtualTour.delete({
        where: { id },
      });

      return { message: 'Virtual tour deleted successfully' };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Virtual tour not found');
      }
      console.error('Error deleting virtual tour:', error);
      throw new InternalServerErrorException('Failed to delete virtual tour');
    }
  }
}
