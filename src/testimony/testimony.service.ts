import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { CreateTestimonyDto } from './dto/create-testimony.dto';
import { UpdateTestimonyDto } from './dto/update-testimony.dto';
import { TestimonyAiService } from '../ai-processing/testimony-ai.service';
import { TestimonyConnectionService } from '../ai-processing/testimony-connection.service';

@Injectable()
export class TestimonyService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationService: NotificationService,
    private testimonyAiService: TestimonyAiService,
    private connectionService: TestimonyConnectionService,
  ) {}

  async create(userId: number, createTestimonyDto: CreateTestimonyDto) {
    // Only require agreedToTerms when NOT saving as draft
    if (!createTestimonyDto.isDraft && !createTestimonyDto.agreedToTerms) {
      throw new BadRequestException(
        'You must agree to the terms and conditions to submit your testimony',
      );
    }

    try {
      const { images, relatives, ...testimonyData } = createTestimonyDto;

      const created = await this.prisma.testimony.create({
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

      // Save relatives with all structured data (relativeTypeId, notes, order)
      if (relatives && Array.isArray(relatives) && relatives.length > 0) {
        const validRelatives = relatives
          .filter(
            (r) =>
              r.personName &&
              typeof r.personName === 'string' &&
              r.personName.trim().length > 0 &&
              r.relativeTypeId,
          )
          .map((r, idx) => ({
            testimonyId: created.id,
            relativeTypeId: r.relativeTypeId!,
            personName: r.personName!.trim(),
            notes: r.notes,
            order: r.order ?? idx,
          }));

        if (validRelatives.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          await (this.prisma as any).testimonyRelative.createMany({
            data: validRelatives,
          });
        }
      }

      if (!createTestimonyDto.isDraft) {
        void this.notificationService
          .notifyTestimonySubmitted({
            testimonyId: created.id,
            submissionType: createTestimonyDto.submissionType,
            submitterName: createTestimonyDto.fullName ?? undefined,
            isDraft: createTestimonyDto.isDraft,
          })
          .catch((err) =>
            console.warn('Failed to create admin notification:', err),
          );
      }

      // Return fully loaded testimony including relatives
      const full = await this.prisma.testimony.findUnique({
        where: { id: created.id },
        include: {
          images: { orderBy: { order: 'asc' } },
          relatives: {
            orderBy: { order: 'asc' },
            include: {
              relativeType: {
                select: { id: true, slug: true, displayName: true },
              },
            },
          },
        },
      });

      return full ?? created;
    } catch (error: unknown) {
      console.error('Error creating testimony:', error);

      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      // Handle Prisma errors
      if (error && typeof error === 'object' && 'code' in error) {
        if (
          (error as any as { meta?: { constraint?: string } } | undefined)?.meta
            ?.constraint === 'testimonies_userId_fkey'
        ) {
          throw new BadRequestException(
            'Invalid user ID - user does not exist',
          );
        }
        if (
          (error as any as { meta?: { constraint?: string } } | undefined)?.meta
            ?.constraint === 'testimony_relatives_relativeTypeId_fkey'
        ) {
          throw new BadRequestException(
            'Invalid relative type. Please select a valid relation.',
          );
        }
        if ((error as any as { code?: string } | undefined)?.code === 'P2002') {
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
          fullTestimony?: { contains: string; mode: 'insensitive' };
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
            relatives: {
              orderBy: { order: 'asc' },
              include: {
                relativeType: {
                  select: { id: true, slug: true, displayName: true },
                },
              },
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

  async getRelated(id: number, limit = 5) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    try {
      // Get connected testimonies via edges with connection details
      const edges = await this.prisma.testimonyEdge.findMany({
        where: {
          fromId: id,
          to: {
            status: 'approved',
            isPublished: true,
          },
        },
        include: {
          to: {
            include: {
              images: { orderBy: { order: 'asc' } },
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  residentPlace: true,
                },
              },
            },
          },
        },
        orderBy: { score: 'desc' },
        take: limit,
      });

      // Map edges to include connection details with accuracy scores
      const relatedWithConnections = edges
        .map((edge) => {
          if (
            !edge.to ||
            edge.to.status !== 'approved' ||
            edge.to.isPublished !== true
          ) {
            return null;
          }

          // Include contact info only if user chose "public" identity preference
          const isPublic = edge.to.identityPreference === 'public';
          const contactInfo =
            isPublic && edge.to.user
              ? {
                  email: edge.to.user.email,
                  fullName: edge.to.user.fullName || edge.to.fullName || null,
                  residentPlace: edge.to.user.residentPlace || null,
                }
              : null;

          return {
            ...edge.to,
            connectionDetails: {
              accuracyScore: Math.round(edge.score * 100), // 0-100 format
              rawScore: edge.score,
              connectionType: edge.type,
              connectionReason: this.getConnectionReason(edge.type),
              source: edge.source,
            },
            contactInfo, // Contact information (only if identityPreference is "public")
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      // If we don't have enough connections, fill with recent approved testimonies
      if (relatedWithConnections.length < limit) {
        const relatedIds = relatedWithConnections.map((t) => t.id);
        const additional = await this.prisma.testimony.findMany({
          where: {
            id: {
              notIn: [id, ...relatedIds],
            },
            status: 'approved',
            isPublished: true,
          },
          include: {
            images: { orderBy: { order: 'asc' } },
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                residentPlace: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit - relatedWithConnections.length,
        });

        // Add connection details for non-connected testimonies (lower accuracy)
        relatedWithConnections.push(
          ...additional.map((testimony) => {
            const isPublic = testimony.identityPreference === 'public';
            const contactInfo =
              isPublic && testimony.user
                ? {
                    email: testimony.user.email,
                    fullName:
                      testimony.user.fullName || testimony.fullName || null,
                    residentPlace: testimony.user.residentPlace || null,
                  }
                : null;

            return {
              ...testimony,
              connectionDetails: {
                accuracyScore: 0, // No connection found
                rawScore: 0,
                connectionType: 'fallback',
                connectionReason: 'Recently published testimony',
                source: 'recent_fallback',
              },
              contactInfo, // Contact information (only if identityPreference is "public")
            };
          }),
        );
      }

      return relatedWithConnections.slice(0, limit);
    } catch (error: unknown) {
      console.error('Error fetching related testimonies:', error);
      throw new InternalServerErrorException(
        'Failed to fetch related testimonies',
      );
    }
  }

  /**
   * Get all AI connections in the system
   * Returns all testimony edges with connection details
   */
  async getAllConnections(limit = 50) {
    try {
      const edges = await this.prisma.testimonyEdge.findMany({
        where: {
          from: {
            status: 'approved',
            isPublished: true,
          },
          to: {
            status: 'approved',
            isPublished: true,
          },
        },
        include: {
          from: {
            select: {
              id: true,
              eventTitle: true,
              eventDescription: true,
            },
          },
          to: {
            select: {
              id: true,
              eventTitle: true,
              eventDescription: true,
            },
          },
        },
        orderBy: { score: 'desc' },
        take: limit,
      });

      return edges.map((edge) => ({
        id: edge.id,
        fromTestimony: {
          id: edge.from.id,
          eventTitle: edge.from.eventTitle,
          eventDescription: edge.from.eventDescription,
        },
        toTestimony: {
          id: edge.to.id,
          eventTitle: edge.to.eventTitle,
          eventDescription: edge.to.eventDescription,
        },
        connectionDetails: {
          accuracyScore: Math.round(edge.score * 100),
          rawScore: edge.score,
          connectionType: edge.type,
          connectionReason: this.getConnectionReason(edge.type),
          source: edge.source,
        },
        createdAt: edge.createdAt,
      }));
    } catch (error: unknown) {
      console.error('Error fetching all connections:', error);
      throw new InternalServerErrorException('Failed to fetch all connections');
    }
  }

  /**
   * Get human-readable reason for connection type
   */
  private getConnectionReason(type: string): string {
    const reasons: Record<string, string> = {
      semantic_similarity: 'Similar content and themes',
      same_event: 'Share the same event',
      same_location: 'Mention the same location',
      same_person: 'Mention the same person',
      same_person_same_type: 'Mention the same person with same relationship',
      same_relation_to_event: 'Both have the same relation to the event',
      same_date: 'Occurred on the same date',
      same_month: 'Occurred in the same month',
      same_year: 'Occurred in the same year',
      overlapping_dates: 'Overlapping time periods',
      nearby_dates: 'Occurred within 30 days',
      fallback: 'Recently published testimony',
    };

    return reasons[type] || 'Connected testimonies';
  }

  async getComparison(id: number, userId: number, userRole?: string) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    if (!userId || userId <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    try {
      const testimony = await this.prisma.testimony.findUnique({
        where: { id },
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
          relatives: {
            include: {
              relativeType: true,
            },
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

      // Allow access if user is admin OR is the testimony owner
      const isAdmin = userRole === 'admin';
      if (!isAdmin && testimony.userId !== userId) {
        throw new ForbiddenException(
          'You can only view comparison of your own testimonies',
        );
      }

      // Get current version
      const current = testimony;

      // Check if there's a previous published version
      const hasPreviousVersion =
        !!testimony.lastPublishedAt && testimony.isPublished;

      const changedFields: string[] = [];
      const hasEdits =
        testimony.lastEditedAt &&
        testimony.lastPublishedAt &&
        testimony.lastEditedAt > testimony.lastPublishedAt;

      if (hasEdits) {
        const editableFields = [
          'eventTitle',
          'eventDescription',
          'fullTestimony',
          'location',
          'dateOfEventFrom',
          'dateOfEventTo',
        ];

        // Only include fields that exist in the testimony
        editableFields.forEach((field) => {
          if (
            field in testimony &&
            testimony[field as keyof typeof testimony]
          ) {
            changedFields.push(field);
          }
        });

        // Check for image changes
        if (testimony.images && testimony.images.length > 0) {
          changedFields.push('images');
        }

        // Check for relative changes
        if (testimony.relatives && testimony.relatives.length > 0) {
          changedFields.push('relatives');
        }
      }

      return {
        current: {
          ...current,
          impressions: current.impressions,
        },
        previous:
          hasPreviousVersion && hasEdits
            ? {
                // Return structure representing last published state
                // Note: Without version history, this is an approximation
                // Store snapshots when publishing for accurate comparison
                ...current,
                // Use lastPublishedAt as the timestamp for the previous version
                updatedAt: testimony.lastPublishedAt,
                lastEditedAt: testimony.lastPublishedAt,
              }
            : undefined,
        changedFields,
        hasPreviousVersion,
        lastPublishedAt: testimony.lastPublishedAt || undefined,
        lastEditedAt: testimony.lastEditedAt || undefined,
      };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error.status === 400 || error.status === 403 || error.status === 404)
      ) {
        throw error;
      }
      console.error('Error fetching testimony comparison:', error);
      throw new InternalServerErrorException(
        'Failed to fetch testimony comparison',
      );
    }
  }

  async findOne(
    id: number,
    userId?: number,
    progressSeconds?: number,
    connectionsLimit: number = 10,
  ) {
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
          relatives: {
            orderBy: { order: 'asc' },
            include: {
              relativeType: {
                select: { id: true, slug: true, displayName: true },
              },
            },
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

      await this.prisma.testimony.update({
        where: { id },
        data: {
          impressions: {
            increment: 1,
          },
        },
      });

      // Get or update resume progress if user is logged in
      let resumeProgress: { lastPositionSeconds: number } | null = null;
      if (userId) {
        if (progressSeconds !== undefined && progressSeconds >= 0) {
          /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
          resumeProgress = await (
            this.prisma as any
          ).testimonyMediaProgress.upsert({
            where: {
              userId_testimonyId: {
                userId,
                testimonyId: id,
              },
            },
            update: {
              lastPositionSeconds: progressSeconds,
            },
            create: {
              userId,
              testimonyId: id,
              lastPositionSeconds: progressSeconds,
            },
          });
        } else {
          /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
          resumeProgress = await (
            this.prisma as any
          ).testimonyMediaProgress.findUnique({
            where: {
              userId_testimonyId: {
                userId,
                testimonyId: id,
              },
            },
          });
        }
      }

      // Get AI connections for this testimony
      let connections: Array<{
        id: number;
        eventTitle: string;
        eventDescription: string | null;
        connectionDetails: {
          accuracyScore: number;
          rawScore: number;
          connectionType: string;
          connectionReason: string;
          source: string | null;
        };
        contactInfo: {
          email: string;
          fullName: string | null;
          residentPlace: string | null;
        } | null;
      }> = [];

      try {
        const related = await this.getRelated(id, connectionsLimit);
        connections = related
          .filter((t) => t.connectionDetails !== undefined)
          .map((t) => ({
            id: t.id,
            eventTitle: t.eventTitle,
            eventDescription: t.eventDescription ?? null,
            connectionDetails: t.connectionDetails as {
              accuracyScore: number;
              rawScore: number;
              connectionType: string;
              connectionReason: string;
              source: string | null;
            },
            contactInfo:
              (
                t as {
                  contactInfo?: {
                    email: string;
                    fullName: string | null;
                    residentPlace: string | null;
                  } | null;
                }
              ).contactInfo ?? null,
          }));
      } catch (error) {
        // If connections fail to load, just log and continue without them
        console.warn(`Failed to load connections for testimony ${id}:`, error);
      }

      return {
        ...testimony,
        impressions: testimony.impressions + 1,
        resumePosition: resumeProgress?.lastPositionSeconds || 0,
        connections, // Include AI connections
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

    const existingTestimony = await this.prisma.testimony.findUnique({
      where: { id },
    });
    if (!existingTestimony) {
      throw new NotFoundException('Testimony not found');
    }

    if (existingTestimony.userId !== userId) {
      throw new ForbiddenException('You can only update your own testimonies');
    }

    // If publishing a draft (changing from draft to published), require agreedToTerms
    if (
      existingTestimony.isDraft &&
      updateTestimonyDto.isDraft === false &&
      !existingTestimony.agreedToTerms
    ) {
      throw new BadRequestException(
        'You must agree to the terms and conditions to publish your testimony',
      );
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

      // Autoset draftLastSavedAt when updating draft fields or fullTestimony
      const shouldTouchDraftTimestamp =
        updateTestimonyDto.fullTestimony !== undefined ||
        updateTestimonyDto.draftCursorPosition !== undefined ||
        updateTestimonyDto.isDraft !== undefined;

      if (shouldTouchDraftTimestamp) {
        updateData.draftLastSavedAt = new Date();
      }

      // Enforce 2-month cooldown on published/approved testimonies
      const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      if (
        existingTestimony.isPublished ||
        existingTestimony.status === 'approved'
      ) {
        const rawNext = (existingTestimony as Record<string, unknown>)[
          'nextEditableAt'
        ];
        const nextEditableAt = rawNext
          ? new Date(rawNext as string | number | Date).getTime()
          : undefined;
        if (nextEditableAt && now < nextEditableAt) {
          const waitMs = nextEditableAt - now;
          const waitDays = Math.ceil(waitMs / (24 * 60 * 60 * 1000));
          throw new ForbiddenException(
            `Edits are limited to once every 2 months. You can edit again in about ${waitDays} day(s).`,
          );
        }
        if (!nextEditableAt) {
          const rawAnchor =
            (existingTestimony as Record<string, unknown>)['lastEditedAt'] ??
            (existingTestimony as Record<string, unknown>)['lastPublishedAt'];
          if (rawAnchor) {
            const anchorTs = new Date(
              rawAnchor as string | number | Date,
            ).getTime();
            if (now < anchorTs + TWO_MONTHS_MS) {
              const waitMs = anchorTs + TWO_MONTHS_MS - now;
              const waitDays = Math.ceil(waitMs / (24 * 60 * 60 * 1000));
              throw new ForbiddenException(
                `Edits are limited to once every 2 months. You can edit again in about ${waitDays} day(s).`,
              );
            }
          }
        }
        // Set next window and lastEditedAt on allowed edit
        updateData['lastEditedAt'] = new Date();
        updateData['nextEditableAt'] = new Date(Date.now() + TWO_MONTHS_MS);
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

    const existingTestimony = await this.prisma.testimony.findUnique({
      where: { id },
    });
    if (!existingTestimony) {
      throw new NotFoundException('Testimony not found');
    }

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

  async getDrafts(userId: number) {
    if (!userId || userId <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    try {
      const where = {
        userId,
        isDraft: true,
      };

      const drafts = await this.prisma.testimony.findMany({
        where,
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
          relatives: {
            orderBy: { order: 'asc' },
            include: {
              relativeType: {
                select: { id: true, slug: true, displayName: true },
              },
            },
          },
        },
        orderBy: [{ draftLastSavedAt: 'desc' }, { updatedAt: 'desc' }],
      });

      return {
        data: drafts,
        total: drafts.length,
      };
    } catch (error: unknown) {
      console.error('Error fetching drafts:', error);

      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      if (error instanceof Error) {
        console.error('Unexpected error fetching drafts:', error.message);
      }
      throw new InternalServerErrorException('Failed to fetch drafts');
    }
  }

  async updateStatus(
    id: number,
    status: string,
    adminId: number,
    feedback?: string,
  ) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    if (!adminId || adminId <= 0) {
      throw new BadRequestException('Invalid admin ID');
    }

    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    // Require feedback when rejecting
    if (status === 'rejected' && (!feedback || feedback.trim().length === 0)) {
      throw new BadRequestException(
        'Rejection reason is required. Please provide feedback on what needs to be improved.',
      );
    }

    try {
      const updateData: {
        status: string;
        reviewedBy: number;
        reviewedAt: Date;
        adminFeedback?: string;
        isPublished?: boolean;
      } = {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      };

      // Handle feedback based on status
      if (status === 'rejected') {
        updateData.adminFeedback = feedback;
      } else if (status === 'approved' && feedback) {
        updateData.adminFeedback = feedback;
      }

      // Auto-publish when approving
      if (status === 'approved') {
        updateData.isPublished = true;
      }

      const testimony = await this.prisma.testimony.update({
        where: { id },
        data: updateData,
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              residentPlace: true,
              email: true,
            },
          },
        },
      });

      // Notify owner via email on status changes (non-blocking)
      const userEmail = (testimony as any)?.user?.email as string | undefined;
      if (userEmail) {
        void this.emailService
          .sendTestimonyStatusEmail({
            to: userEmail,
            status: status as 'approved' | 'rejected' | 'pending',
            feedback,
            testimonyTitle: testimony.eventTitle,
            testimonyId: testimony.id,
          })
          .catch((notifyErr) => {
            // Log but don't fail the request if email fails
            console.warn('Failed to send testimony status email:', notifyErr);
          });
      }

      if (status !== 'pending') {
        void this.notificationService
          .notifyFeedbackResolved({
            testimonyId: testimony.id,
            status,
            adminId,
            feedback,
          })
          .catch((err) =>
            console.warn('Failed to create feedback notification:', err),
          );
      }

      if (status === 'approved') {
        void this.testimonyAiService
          .processTestimony(testimony.id)
          .catch((err) =>
            console.warn(
              `Failed to enqueue AI processing for testimony ${testimony.id}:`,
              err,
            ),
          );
      }

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
}
