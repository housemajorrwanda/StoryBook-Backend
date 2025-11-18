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
import { CreateVirtualTourDto } from './dto/create-virtual-tour.dto';
import { UpdateVirtualTourDto } from './dto/update-virtual-tour.dto';

interface VirtualTourFilters {
  skip?: number;
  limit?: number;
  search?: string;
  tourType?: string;
  status?: string;
  userId?: number;
  isPublished?: boolean;
}

@Injectable()
export class VirtualTourService {
  constructor(private prisma: PrismaService) {}

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

  private validateTourContent(dto: Partial<CreateVirtualTourDto> | Partial<UpdateVirtualTourDto>): void {
    // Validate that required URLs are provided based on tour type
    if (dto.tourType) {
      switch (dto.tourType) {
        case 'embed':
          if (!dto.embedUrl) {
            throw new BadRequestException('embedUrl is required for embed tours');
          }
          break;
        case '360_image':
          if (!dto.image360Url) {
            throw new BadRequestException('image360Url is required for 360 image tours');
          }
          break;
        case '360_video':
          if (!dto.video360Url) {
            throw new BadRequestException('video360Url is required for 360 video tours');
          }
          break;
        case '3d_model':
          if (!dto.model3dUrl) {
            throw new BadRequestException('model3dUrl is required for 3D model tours');
          }
          break;
      }
    }

    // Validate hotspots if provided
    if (dto.hotspots && Array.isArray(dto.hotspots)) {
      dto.hotspots.forEach((hotspot, index) => {
        this.validateHotspot(hotspot, index);
      });
    }

    // Validate audio regions if provided
    if (dto.audioRegions && Array.isArray(dto.audioRegions)) {
      dto.audioRegions.forEach((region, index) => {
        this.validateAudioRegion(region, index);
      });
    }

    // Validate effects if provided
    if (dto.effects && Array.isArray(dto.effects)) {
      dto.effects.forEach((effect, index) => {
        this.validateEffect(effect, index);
      });
    }
  }

  private validateHotspot(hotspot: any, index: number): void {
    if (!hotspot.type) {
      throw new BadRequestException(`Hotspot ${index}: type is required`);
    }

    // Validate required fields based on type
    switch (hotspot.type) {
      case 'link':
        if (!hotspot.actionUrl) {
          throw new BadRequestException(`Hotspot ${index}: actionUrl is required for link type`);
        }
        break;
      case 'audio':
        if (!hotspot.actionAudioUrl) {
          throw new BadRequestException(`Hotspot ${index}: actionAudioUrl is required for audio type`);
        }
        break;
      case 'video':
        if (!hotspot.actionVideoUrl) {
          throw new BadRequestException(`Hotspot ${index}: actionVideoUrl is required for video type`);
        }
        break;
      case 'image':
        if (!hotspot.actionImageUrl) {
          throw new BadRequestException(`Hotspot ${index}: actionImageUrl is required for image type`);
        }
        break;
      case 'effect':
        if (!hotspot.actionEffect) {
          throw new BadRequestException(`Hotspot ${index}: actionEffect is required for effect type`);
        }
        break;
    }

    // Validate position values if provided
    if (hotspot.pitch !== undefined && (hotspot.pitch < -90 || hotspot.pitch > 90)) {
      throw new BadRequestException(`Hotspot ${index}: pitch must be between -90 and 90 degrees`);
    }
    if (hotspot.yaw !== undefined && (hotspot.yaw < 0 || hotspot.yaw > 360)) {
      throw new BadRequestException(`Hotspot ${index}: yaw must be between 0 and 360 degrees`);
    }
  }

  private validateAudioRegion(region: any, index: number): void {
    if (!region.regionType) {
      throw new BadRequestException(`Audio region ${index}: regionType is required`);
    }

    if (region.regionType === 'sphere' && !region.radius) {
      throw new BadRequestException(`Audio region ${index}: radius is required for sphere regions`);
    }

    if (region.regionType === 'box') {
      if (!region.width || !region.height || !region.depth) {
        throw new BadRequestException(
          `Audio region ${index}: width, height, and depth are required for box regions`
        );
      }
    }

    if (!region.audioUrl) {
      throw new BadRequestException(`Audio region ${index}: audioUrl is required`);
    }

    if (!region.audioFileName) {
      throw new BadRequestException(`Audio region ${index}: audioFileName is required`);
    }

    // Validate numeric constraints
    if (region.volume !== undefined && (region.volume < 0 || region.volume > 1)) {
      throw new BadRequestException(`Audio region ${index}: volume must be between 0 and 1`);
    }
  }

  private validateEffect(effect: any, index: number): void {
    if (!effect.effectType) {
      throw new BadRequestException(`Effect ${index}: effectType is required`);
    }

    if (!effect.triggerType) {
      throw new BadRequestException(`Effect ${index}: triggerType is required`);
    }

    if (!effect.effectName) {
      throw new BadRequestException(`Effect ${index}: effectName is required`);
    }

    // Validate type-specific requirements
    if (effect.effectType === 'sound' && !effect.soundUrl) {
      throw new BadRequestException(`Effect ${index}: soundUrl is required for sound effects`);
    }

    if (effect.effectType === 'particle' && !effect.particleCount) {
      throw new BadRequestException(`Effect ${index}: particleCount is required for particle effects`);
    }

    if (effect.effectType === 'animation' && !effect.animationType) {
      throw new BadRequestException(`Effect ${index}: animationType is required for animation effects`);
    }

    // Validate numeric constraints
    if (effect.intensity !== undefined && (effect.intensity < 0 || effect.intensity > 1)) {
      throw new BadRequestException(`Effect ${index}: intensity must be between 0 and 1`);
    }

    if (effect.opacity !== undefined && (effect.opacity < 0 || effect.opacity > 1)) {
      throw new BadRequestException(`Effect ${index}: opacity must be between 0 and 1`);
    }
  }

  async create(userId: number, createVirtualTourDto: CreateVirtualTourDto) {
    try {
      // Validate tour content
      this.validateTourContent(createVirtualTourDto);

      const { hotspots, audioRegions, effects, ...tourData } = createVirtualTourDto;

      // Prepare nested data
      const data: any = {
        ...tourData,
        userId,
      };

      if (hotspots && hotspots.length > 0) {
        data.hotspots = {
          create: hotspots.map((hotspot, index) => ({
            ...hotspot,
            order: hotspot.order ?? index,
          })),
        };
      }

      if (audioRegions && audioRegions.length > 0) {
        data.audioRegions = {
          create: audioRegions.map((region, index) => ({
            ...region,
            order: region.order ?? index,
          })),
        };
      }

      if (effects && effects.length > 0) {
        data.effects = {
          create: effects.map((effect, index) => ({
            ...effect,
            order: effect.order ?? index,
          })),
        };
      }

      const virtualTour = await this.prisma.virtualTour.create({
        data,
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
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.handlePrismaError(error);
    }
  }

  async findAll(filters: VirtualTourFilters = {}) {
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

      const where: Prisma.VirtualTourWhereInput = {};

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (tourType) {
        where.tourType = tourType;
      }

      if (status) {
        where.status = status;
      }

      if (userId) {
        where.userId = userId;
      }

      if (isPublished !== undefined) {
        where.isPublished = isPublished;
      }

      const [tours, total] = await Promise.all([
        this.prisma.virtualTour.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
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
          },
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

  async update(id: number, userId: number, updateVirtualTourDto: Partial<UpdateVirtualTourDto>) {
    try {
      // Check if virtual tour exists and user has permission
      const existingTour = await this.prisma.virtualTour.findUnique({
        where: { id },
      });

      if (!existingTour) {
        throw new NotFoundException('Virtual tour not found');
      }

      if (existingTour.userId !== userId) {
        throw new ForbiddenException('You can only update your own virtual tours');
      }

      // Validate tour content if provided
      if (Object.keys(updateVirtualTourDto).length > 0) {
        this.validateTourContent(updateVirtualTourDto);
      }

      const { hotspots, audioRegions, effects, incrementImpressions, ...tourData } = updateVirtualTourDto;

      // Build update data
      const updateData: any = {
        ...tourData,
      };

      if (incrementImpressions) {
        updateData.impressions = { increment: 1 };
      }

      // Handle nested updates
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
      // Check if virtual tour exists and user has permission
      const existingTour = await this.prisma.virtualTour.findUnique({
        where: { id },
      });

      if (!existingTour) {
        throw new NotFoundException('Virtual tour not found');
      }

      if (existingTour.userId !== userId) {
        throw new ForbiddenException('You can only delete your own virtual tours');
      }

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
      status: 'published',
      isPublished: true,
    });
  }

  async unpublish(id: number, userId: number) {
    return this.update(id, userId, {
      status: 'draft',
      isPublished: false,
    });
  }

  async archive(id: number, userId: number) {
    return this.update(id, userId, {
      status: 'archived',
      isPublished: false,
    });
  }
}