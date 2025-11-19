import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVirtualTourDto, TourType, TourStatus } from './dto/create-virtual-tour.dto';
import { UpdateVirtualTourDto } from './dto/update-virtual-tour.dto';
import { CreateHotspotDto } from './dto/create-hotspot.dto';
import { UpdateHotspotDto } from './dto/update-hotspot.dto';
import { CreateAudioRegionDto } from './dto/create-audio-region.dto';
import { UpdateAudioRegionDto } from './dto/update-audio-region.dto';
import { CreateEffectDto } from './dto/create-effect.dto';
import { UpdateEffectDto } from './dto/update-effect.dto';

export interface VirtualTourFilters {
  skip?: number;
  limit?: number;
  search?: string;
  tourType?: string;
  status?: string;
  userId?: number;
  isPublished?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    skip: number;
    limit: number;
    hasMore: boolean;
  };
}

@Injectable()
export class VirtualTourService {
  constructor(private prisma: PrismaService) { }

  private handlePrismaError(error: any, entity: string = 'Virtual tour'): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException(`${entity} with this data already exists`);
        case 'P2003':
          throw new BadRequestException('Invalid foreign key relationship');
        case 'P2025':
          throw new NotFoundException(`${entity} not found`);
        default:
          throw new InternalServerErrorException('Database operation failed');
      }
    }
    throw new InternalServerErrorException('An unexpected error occurred');
  }

  private validateTourUrls(dto: Partial<CreateVirtualTourDto> | Partial<UpdateVirtualTourDto>): void {
    if (dto.tourType) {
      switch (dto.tourType) {
        case TourType.EMBED:
          if (!dto.embedUrl) {
            throw new BadRequestException('embedUrl is required for embed tours');
          }
          break;
        case TourType.IMAGE_360:
          if (!dto.image360Url) {
            throw new BadRequestException('image360Url is required for 360 image tours');
          }
          break;
        case TourType.VIDEO_360:
          if (!dto.video360Url) {
            throw new BadRequestException('video360Url is required for 360 video tours');
          }
          break;
        case TourType.MODEL_3D:
          if (!dto.model3dUrl) {
            throw new BadRequestException('model3dUrl is required for 3D model tours');
          }
          break;
      }
    }
  }

  private async verifyTourOwnership(tourId: number, userId: number): Promise<void> {
    const tour = await this.prisma.virtualTour.findUnique({
      where: { id: tourId },
      select: { userId: true },
    });

    if (!tour) {
      throw new NotFoundException('Virtual tour not found');
    }

    if (tour.userId !== userId) {
      throw new ForbiddenException('You can only modify your own virtual tours');
    }
  }

  private async verifyTourExists(tourId: number): Promise<void> {
    const tour = await this.prisma.virtualTour.findUnique({
      where: { id: tourId },
      select: { id: true },
    });

    if (!tour) {
      throw new NotFoundException('Virtual tour not found');
    }
  }

  // ==================== VIRTUAL TOUR CRUD OPERATIONS ====================

  /**
   * Create virtual tour (basic - without nested elements)
   */
  async create(userId: number, createVirtualTourDto: CreateVirtualTourDto) {
    try {
      this.validateTourUrls(createVirtualTourDto);

      const virtualTour = await this.prisma.virtualTour.create({
        data: {
          ...createVirtualTourDto,
          userId,
          status: createVirtualTourDto.status || TourStatus.DRAFT,
          isPublished: createVirtualTourDto.isPublished || false,
        },
      });

      return virtualTour;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }

  /**
   * Create virtual tour with nested hotspots, audio regions, and effects
   */
  async createWithNested(
    userId: number,
    createVirtualTourDto: CreateVirtualTourDto,
    hotspots?: Partial<CreateHotspotDto>[],
    audioRegions?: Partial<CreateAudioRegionDto>[],
    effects?: Partial<CreateEffectDto>[],
  ) {
    try {
      this.validateTourUrls(createVirtualTourDto);

      // Use transaction to ensure atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Create the virtual tour
        const virtualTour = await tx.virtualTour.create({
          data: {
            ...createVirtualTourDto,
            userId,
            status: createVirtualTourDto.status || TourStatus.DRAFT,
            isPublished: createVirtualTourDto.isPublished || false,
          },
        });

        // Create hotspots if provided
        if (hotspots && hotspots.length > 0) {
          await tx.virtualTourHotspot.createMany({
            data: hotspots.map((hotspot, index) => ({
              virtualTourId: virtualTour.id,
              type: hotspot.type!,
              positionX: hotspot.positionX,
              positionY: hotspot.positionY,
              positionZ: hotspot.positionZ,
              pitch: hotspot.pitch,
              yaw: hotspot.yaw,
              title: hotspot.title,
              description: hotspot.description,
              icon: hotspot.icon,
              actionUrl: hotspot.actionUrl,
              actionAudioUrl: hotspot.actionAudioUrl,
              actionVideoUrl: hotspot.actionVideoUrl,
              actionImageUrl: hotspot.actionImageUrl,
              actionEffect: hotspot.actionEffect,
              triggerDistance: hotspot.triggerDistance,
              autoTrigger: hotspot.autoTrigger,
              showOnHover: hotspot.showOnHover,
              color: hotspot.color,
              size: hotspot.size,
              order: hotspot.order ?? index,
            })),
          });
        }

        // Create audio regions if provided
        if (audioRegions && audioRegions.length > 0) {
          await tx.virtualTourAudioRegion.createMany({
            data: audioRegions.map((region, index) => ({
              virtualTourId: virtualTour.id,
              regionType: region.regionType ?? 'sphere',
              centerX: region.centerX!,
              centerY: region.centerY!,
              centerZ: region.centerZ!,
              radius: region.radius,
              width: region.width,
              height: region.height,
              depth: region.depth,
              audioUrl: region.audioUrl!,
              audioFileName: region.audioFileName!,
              volume: region.volume ?? 1.0,
              loop: region.loop ?? true,
              fadeInDuration: region.fadeInDuration,
              fadeOutDuration: region.fadeOutDuration,
              spatialAudio: region.spatialAudio ?? true,
              minDistance: region.minDistance,
              maxDistance: region.maxDistance,
              autoPlay: region.autoPlay ?? true,
              playOnce: region.playOnce ?? false,
              title: region.title,
              description: region.description,
              order: region.order ?? index,
            })),
          });
        }

        // Create effects if provided
        if (effects && effects.length > 0) {
          await tx.virtualTourEffect.createMany({
            data: effects.map((effect, index) => ({
              virtualTourId: virtualTour.id,
              effectType: effect.effectType!,
              positionX: effect.positionX,
              positionY: effect.positionY,
              positionZ: effect.positionZ,
              pitch: effect.pitch,
              yaw: effect.yaw,
              triggerType: effect.triggerType!,
              triggerDistance: effect.triggerDistance,
              triggerDelay: effect.triggerDelay ?? 0.0,
              effectName: effect.effectName!,
              intensity: effect.intensity ?? 1.0,
              duration: effect.duration,
              color: effect.color,
              soundUrl: effect.soundUrl,
              particleCount: effect.particleCount,
              opacity: effect.opacity ?? 1.0,
              size: effect.size ?? 1.0,
              animationType: effect.animationType,
              animationSpeed: effect.animationSpeed ?? 1.0,
              title: effect.title,
              description: effect.description,
              order: effect.order ?? index,
            })),
          });
        }

        // Fetch complete tour with all nested data
        return await tx.virtualTour.findUnique({
          where: { id: virtualTour.id },
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
      });

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }

  async findAll(filters: VirtualTourFilters = {}): Promise<PaginatedResult<any>> {
    try {
      const {
        skip = 0,
        limit = 50,
        search,
        tourType,
        status,
        userId,
        isPublished,
      } = filters;

      const where: Prisma.VirtualTourWhereInput = this.buildWhereClause({
        search,
        tourType,
        status,
        userId,
        isPublished,
      });

      const [tours, total] = await Promise.all([
        this.prisma.virtualTour.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: this.getTourListIncludeFields(),
        }),
        this.prisma.virtualTour.count({ where }),
      ]);

      return {
        data: tours,
        meta: {
          total,
          skip,
          limit,
          hasMore: total > skip + limit,
        },
      };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findOne(id: number) {
    try {
      const virtualTour = await this.prisma.virtualTour.findUnique({
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
              email: true,
            },
          },
        },
      });

      if (!virtualTour) {
        throw new NotFoundException('Virtual tour not found');
      }

      return virtualTour;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }

  async update(id: number, userId: number, updateVirtualTourDto: UpdateVirtualTourDto) {
    try {
      await this.verifyTourOwnership(id, userId);

      if (Object.keys(updateVirtualTourDto).length > 0) {
        this.validateTourUrls(updateVirtualTourDto);
      }

      const { incrementImpressions, ...tourData } = updateVirtualTourDto;

      const updateData: Prisma.VirtualTourUpdateInput = {
        ...tourData,
      };

      if (incrementImpressions) {
        updateData.impressions = { increment: 1 };
      }

      const virtualTour = await this.prisma.virtualTour.update({
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
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      return virtualTour;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }

  async remove(id: number, userId: number) {
    try {
      await this.verifyTourOwnership(id, userId);

      await this.prisma.virtualTour.delete({
        where: { id },
      });

      return { message: 'Virtual tour deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }

  // ==================== TOUR MANAGEMENT OPERATIONS ====================

  async incrementImpressions(id: number) {
    try {
      const virtualTour = await this.prisma.virtualTour.update({
        where: { id },
        data: {
          impressions: { increment: 1 },
        },
        select: {
          id: true,
          impressions: true,
          title: true,
        },
      });

      return virtualTour;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Virtual tour not found');
      }
      this.handlePrismaError(error);
    }
  }

  async getUserTours(userId: number, filters: Omit<VirtualTourFilters, 'userId'> = {}) {
    return this.findAll({
      ...filters,
      userId,
    });
  }

  async publish(id: number, userId: number) {
    return this.update(id, userId, {
      status: TourStatus.PUBLISHED,
      isPublished: true,
    });
  }

  async unpublish(id: number, userId: number) {
    return this.update(id, userId, {
      status: TourStatus.DRAFT,
      isPublished: false,
    });
  }

  async archive(id: number, userId: number) {
    return this.update(id, userId, {
      status: TourStatus.ARCHIVED,
      isPublished: false,
    });
  }

  // ==================== HOTSPOT CRUD OPERATIONS ====================

  async createHotspot(virtualTourId: number, userId: number, createHotspotDto: CreateHotspotDto) {
    try {
      await this.verifyTourOwnership(virtualTourId, userId);

      const hotspot = await this.prisma.virtualTourHotspot.create({
        data: {
          ...createHotspotDto,
          virtualTourId,
          order: createHotspotDto.order ?? 0,
        },
        include: this.getHotspotIncludeFields(),
      });

      return hotspot;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.handlePrismaError(error, 'Hotspot');
    }
  }

  async getTourHotspots(virtualTourId: number) {
    try {
      await this.verifyTourExists(virtualTourId);

      const hotspots = await this.prisma.virtualTourHotspot.findMany({
        where: { virtualTourId },
        orderBy: { order: 'asc' },
        include: this.getHotspotIncludeFields(),
      });

      return hotspots;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async getHotspot(id: number) {
    try {
      const hotspot = await this.prisma.virtualTourHotspot.findUnique({
        where: { id },
        include: this.getHotspotIncludeFields(),
      });

      if (!hotspot) {
        throw new NotFoundException('Hotspot not found');
      }

      return hotspot;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }

  async updateHotspot(id: number, userId: number, updateHotspotDto: UpdateHotspotDto) {
    try {
      const hotspot = await this.prisma.virtualTourHotspot.findUnique({
        where: { id },
        include: { virtualTour: { select: { userId: true } } },
      });

      if (!hotspot) {
        throw new NotFoundException('Hotspot not found');
      }

      if (hotspot.virtualTour.userId !== userId) {
        throw new ForbiddenException('You can only update hotspots in your own virtual tours');
      }

      const updatedHotspot = await this.prisma.virtualTourHotspot.update({
        where: { id },
        data: updateHotspotDto,
        include: this.getHotspotIncludeFields(),
      });

      return updatedHotspot;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.handlePrismaError(error, 'Hotspot');
    }
  }

  async deleteHotspot(id: number, userId: number) {
    try {
      const hotspot = await this.prisma.virtualTourHotspot.findUnique({
        where: { id },
        include: { virtualTour: { select: { userId: true } } },
      });

      if (!hotspot) {
        throw new NotFoundException('Hotspot not found');
      }

      if (hotspot.virtualTour.userId !== userId) {
        throw new ForbiddenException('You can only delete hotspots from your own virtual tours');
      }

      await this.prisma.virtualTourHotspot.delete({
        where: { id },
      });

      return { message: 'Hotspot deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.handlePrismaError(error, 'Hotspot');
    }
  }

  // ==================== AUDIO REGION CRUD OPERATIONS ====================

  async createAudioRegion(virtualTourId: number, userId: number, createAudioRegionDto: CreateAudioRegionDto) {
    try {
      await this.verifyTourOwnership(virtualTourId, userId);

      const audioRegion = await this.prisma.virtualTourAudioRegion.create({
        data: {
          ...createAudioRegionDto,
          virtualTourId,
          order: createAudioRegionDto.order ?? 0,
        },
        include: this.getAudioRegionIncludeFields(),
      });

      return audioRegion;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.handlePrismaError(error, 'Audio region');
    }
  }

  async getTourAudioRegions(virtualTourId: number) {
    try {
      await this.verifyTourExists(virtualTourId);

      const audioRegions = await this.prisma.virtualTourAudioRegion.findMany({
        where: { virtualTourId },
        orderBy: { order: 'asc' },
        include: this.getAudioRegionIncludeFields(),
      });

      return audioRegions;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async getAudioRegion(id: number) {
    try {
      const audioRegion = await this.prisma.virtualTourAudioRegion.findUnique({
        where: { id },
        include: this.getAudioRegionIncludeFields(),
      });

      if (!audioRegion) {
        throw new NotFoundException('Audio region not found');
      }

      return audioRegion;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }

  async updateAudioRegion(id: number, userId: number, updateAudioRegionDto: UpdateAudioRegionDto) {
    try {
      const audioRegion = await this.prisma.virtualTourAudioRegion.findUnique({
        where: { id },
        include: { virtualTour: { select: { userId: true } } },
      });

      if (!audioRegion) {
        throw new NotFoundException('Audio region not found');
      }

      if (audioRegion.virtualTour.userId !== userId) {
        throw new ForbiddenException('You can only update audio regions in your own virtual tours');
      }

      const updatedAudioRegion = await this.prisma.virtualTourAudioRegion.update({
        where: { id },
        data: updateAudioRegionDto,
        include: this.getAudioRegionIncludeFields(),
      });

      return updatedAudioRegion;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.handlePrismaError(error, 'Audio region');
    }
  }

  async deleteAudioRegion(id: number, userId: number) {
    try {
      const audioRegion = await this.prisma.virtualTourAudioRegion.findUnique({
        where: { id },
        include: { virtualTour: { select: { userId: true } } },
      });

      if (!audioRegion) {
        throw new NotFoundException('Audio region not found');
      }

      if (audioRegion.virtualTour.userId !== userId) {
        throw new ForbiddenException('You can only delete audio regions from your own virtual tours');
      }

      await this.prisma.virtualTourAudioRegion.delete({
        where: { id },
      });

      return { message: 'Audio region deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.handlePrismaError(error, 'Audio region');
    }
  }

  // ==================== EFFECT CRUD OPERATIONS ====================

  async createEffect(virtualTourId: number, userId: number, createEffectDto: CreateEffectDto) {
    try {
      await this.verifyTourOwnership(virtualTourId, userId);

      const effect = await this.prisma.virtualTourEffect.create({
        data: {
          ...createEffectDto,
          virtualTourId,
          order: createEffectDto.order ?? 0,
        },
        include: this.getEffectIncludeFields(),
      });

      return effect;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.handlePrismaError(error, 'Effect');
    }
  }

  async getTourEffects(virtualTourId: number) {
    try {
      await this.verifyTourExists(virtualTourId);

      const effects = await this.prisma.virtualTourEffect.findMany({
        where: { virtualTourId },
        orderBy: { order: 'asc' },
        include: this.getEffectIncludeFields(),
      });

      return effects;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async getEffect(id: number) {
    try {
      const effect = await this.prisma.virtualTourEffect.findUnique({
        where: { id },
        include: this.getEffectIncludeFields(),
      });

      if (!effect) {
        throw new NotFoundException('Effect not found');
      }

      return effect;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }

  async updateEffect(id: number, userId: number, updateEffectDto: UpdateEffectDto) {
    try {
      const effect = await this.prisma.virtualTourEffect.findUnique({
        where: { id },
        include: { virtualTour: { select: { userId: true } } },
      });

      if (!effect) {
        throw new NotFoundException('Effect not found');
      }

      if (effect.virtualTour.userId !== userId) {
        throw new ForbiddenException('You can only update effects in your own virtual tours');
      }

      const updatedEffect = await this.prisma.virtualTourEffect.update({
        where: { id },
        data: updateEffectDto,
        include: this.getEffectIncludeFields(),
      });

      return updatedEffect;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.handlePrismaError(error, 'Effect');
    }
  }

  async deleteEffect(id: number, userId: number) {
    try {
      const effect = await this.prisma.virtualTourEffect.findUnique({
        where: { id },
        include: { virtualTour: { select: { userId: true } } },
      });

      if (!effect) {
        throw new NotFoundException('Effect not found');
      }

      if (effect.virtualTour.userId !== userId) {
        throw new ForbiddenException('You can only delete effects from your own virtual tours');
      }

      await this.prisma.virtualTourEffect.delete({
        where: { id },
      });

      return { message: 'Effect deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.handlePrismaError(error, 'Effect');
    }
  }

  // ==================== BULK REORDERING OPERATIONS ====================

  async reorderHotspots(virtualTourId: number, userId: number, hotspotIds: number[]) {
    try {
      await this.verifyTourOwnership(virtualTourId, userId);

      const updates = hotspotIds.map((hotspotId, index) =>
        this.prisma.virtualTourHotspot.update({
          where: { id: hotspotId },
          data: { order: index },
        })
      );

      await this.prisma.$transaction(updates);

      return { message: 'Hotspots reordered successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }

  async reorderAudioRegions(virtualTourId: number, userId: number, audioRegionIds: number[]) {
    try {
      await this.verifyTourOwnership(virtualTourId, userId);

      const updates = audioRegionIds.map((audioRegionId, index) =>
        this.prisma.virtualTourAudioRegion.update({
          where: { id: audioRegionId },
          data: { order: index },
        })
      );

      await this.prisma.$transaction(updates);

      return { message: 'Audio regions reordered successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }

  async reorderEffects(virtualTourId: number, userId: number, effectIds: number[]) {
    try {
      await this.verifyTourOwnership(virtualTourId, userId);

      const updates = effectIds.map((effectId, index) =>
        this.prisma.virtualTourEffect.update({
          where: { id: effectId },
          data: { order: index },
        })
      );

      await this.prisma.$transaction(updates);

      return { message: 'Effects reordered successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }

  // ==================== HELPER METHODS ====================

  private buildWhereClause(filters: {
    search?: string;
    tourType?: string;
    status?: string;
    userId?: number;
    isPublished?: boolean;
  }): Prisma.VirtualTourWhereInput {
    const where: Prisma.VirtualTourWhereInput = {};

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { location: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.tourType) {
      where.tourType = filters.tourType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.isPublished !== undefined) {
      where.isPublished = filters.isPublished;
    }

    return where;
  }

  private getTourListIncludeFields() {
    return {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      _count: {
        select: {
          hotspots: true,
          audioRegions: true,
          effects: true,
        },
      },
    };
  }

  private getHotspotIncludeFields() {
    return {
      virtualTour: {
        select: {
          id: true,
          title: true,
          userId: true,
        },
      },
    };
  }

  private getAudioRegionIncludeFields() {
    return {
      virtualTour: {
        select: {
          id: true,
          title: true,
          userId: true,
        },
      },
    };
  }

  private getEffectIncludeFields() {
    return {
      virtualTour: {
        select: {
          id: true,
          title: true,
          userId: true,
        },
      },
    };
  }
}