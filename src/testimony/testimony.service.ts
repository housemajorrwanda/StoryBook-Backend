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
import { EmbeddingProviderService } from '../ai-processing/embedding-provider.service';

@Injectable()
export class TestimonyService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationService: NotificationService,
    private testimonyAiService: TestimonyAiService,
    private connectionService: TestimonyConnectionService,
    private embeddingProvider: EmbeddingProviderService,
  ) {}

  // ========== Relative Types CRUD ==========

  async getRelativeTypes() {
    return this.prisma.relativeType.findMany({
      select: { id: true, slug: true, displayName: true, synonyms: true },
      orderBy: { id: 'asc' },
    });
  }

  async createRelativeType(data: {
    slug: string;
    displayName: string;
    synonyms?: string;
  }) {
    return this.prisma.relativeType.create({
      data: {
        slug: data.slug,
        displayName: data.displayName,
        synonyms: data.synonyms ?? null,
      },
    });
  }

  async updateRelativeType(
    id: number,
    data: { slug?: string; displayName?: string; synonyms?: string },
  ) {
    const existing = await this.prisma.relativeType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Relative type with ID ${id} not found`);
    }
    return this.prisma.relativeType.update({ where: { id }, data });
  }

  async deleteRelativeType(id: number) {
    const existing = await this.prisma.relativeType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Relative type with ID ${id} not found`);
    }
    const usageCount = await this.prisma.testimonyRelative.count({
      where: { relativeTypeId: id },
    });
    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete: ${usageCount} testimonies are using this relative type. Reassign them first.`,
      );
    }
    await this.prisma.relativeType.delete({ where: { id } });
    return { message: `Relative type "${existing.displayName}" deleted` };
  }

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
            reviewer: {
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
              images: { orderBy: { order: 'asc' }, take: 1 },
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
              accuracyScore: Math.round(edge.score * 100),
              rawScore: edge.score,
              connectionType: edge.type,
              connectionReason: this.getConnectionReason(edge.type),
              source: edge.source,
              userRating: edge.userRating,
            },
            contactInfo,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      // Only return real AI connections — no fallback padding
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

  async getApprovedTestimonyIds() {
    return this.prisma.testimony.findMany({
      where: { status: 'approved', isPublished: true },
      select: { id: true },
    });
  }

  async clearAllConnections() {
    // Only clear unrated edges; rated edges will be updated in-place during rebuild
    await this.prisma.testimonyEdge.deleteMany({
      where: { userRating: null },
    });
  }

  /**
   * Get AI connections for the logged-in user's testimonies
   */
  async getMyConnections(userId: number) {
    const edges = await this.prisma.testimonyEdge.findMany({
      where: {
        from: {
          userId,
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
          },
        },
        to: {
          include: {
            images: { orderBy: { order: 'asc' }, take: 1 },
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
    });

    return edges.map((edge) => {
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
        myTestimony: {
          id: edge.from.id,
          eventTitle: edge.from.eventTitle,
        },
        connectedTestimony: {
          id: edge.to.id,
          eventTitle: edge.to.eventTitle,
          eventDescription: edge.to.eventDescription,
          summary: edge.to.summary,
          location: edge.to.location,
          dateOfEventFrom: edge.to.dateOfEventFrom,
          dateOfEventTo: edge.to.dateOfEventTo,
          submissionType: edge.to.submissionType,
          createdAt: edge.to.createdAt,
          images: (edge.to.images ?? []).map((img) => ({
            imageUrl: img.imageUrl,
            description: img.description ?? null,
          })),
        },
        connectionDetails: {
          accuracyScore: Math.round(edge.score * 100),
          rawScore: edge.score,
          connectionType: edge.type,
          connectionReason: this.getConnectionReason(edge.type),
          source: edge.source,
          userRating: edge.userRating,
        },
        contactInfo,
      };
    });
  }

  /**
   * Get human-readable reason for connection type
   */
  private getConnectionReason(type: string): string {
    const reasons: Record<string, string> = {
      semantic_similarity_strong: 'Very similar content and themes',
      semantic_similarity_moderate: 'Similar content and themes',
      semantic_similarity_weak: 'Loosely related content',
      semantic_similarity: 'Similar content and themes',
      hybrid_connection:
        'Strong connection based on content and shared details',
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
      suggestion: 'You might also find this testimony relevant',
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
          reviewer: {
            select: {
              id: true,
              fullName: true,
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
        summary: string | null;
        location: string | null;
        dateOfEventFrom: Date | null;
        dateOfEventTo: Date | null;
        submissionType: string;
        createdAt: Date;
        images: Array<{ imageUrl: string; description: string | null }>;
        connectionDetails: {
          accuracyScore: number;
          rawScore: number;
          connectionType: string;
          connectionReason: string;
          source: string | null;
          userRating: number | null;
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
            summary: t.summary ?? null,
            location: t.location ?? null,
            dateOfEventFrom: t.dateOfEventFrom ?? null,
            dateOfEventTo: t.dateOfEventTo ?? null,
            submissionType: t.submissionType,
            createdAt: t.createdAt,
            images: (t.images ?? []).map((img) => ({
              imageUrl: img.imageUrl,
              description: img.description ?? null,
            })),
            connectionDetails: t.connectionDetails as {
              accuracyScore: number;
              rawScore: number;
              connectionType: string;
              connectionReason: string;
              source: string | null;
              userRating: number | null;
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

      // Re-discover AI connections if content changed on an approved testimony
      if (testimony.status === 'approved' && testimony.isPublished) {
        const contentChanged =
          updateTestimonyDto.eventTitle !== undefined ||
          updateTestimonyDto.eventDescription !== undefined ||
          updateTestimonyDto.fullTestimony !== undefined ||
          updateTestimonyDto.dateOfEventFrom !== undefined ||
          updateTestimonyDto.dateOfEventTo !== undefined;

        if (contentChanged) {
          void this.connectionService
            .discoverConnections(id)
            .catch((err) =>
              console.warn(
                `Failed to re-discover connections for testimony ${id}:`,
                err,
              ),
            );
        }
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

  async getTranscript(id: number) {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    try {
      const testimony = await this.prisma.testimony.findUnique({
        where: { id },
        select: {
          id: true,
          transcript: true,
          submissionType: true,
          audioUrl: true,
          videoUrl: true,
        },
      });

      if (!testimony) {
        throw new NotFoundException('Testimony not found');
      }

      const hasTranscript = !!testimony.transcript;
      const canHaveTranscript =
        testimony.submissionType === 'audio' ||
        testimony.submissionType === 'video';

      let transcriptStatus = 'available';
      if (!hasTranscript && canHaveTranscript) {
        if (testimony.audioUrl || testimony.videoUrl) {
          transcriptStatus =
            'pending - transcription is processing or not yet started. Check back later.';
        } else {
          transcriptStatus = 'unavailable - no media file found';
        }
      } else if (!canHaveTranscript) {
        transcriptStatus =
          'not applicable - written testimonies do not have transcripts';
      }

      return {
        id: testimony.id,
        transcript: testimony.transcript ?? null,
        hasTranscript,
        submissionType: testimony.submissionType,
        canHaveTranscript,
        hasMedia: !!(testimony.audioUrl || testimony.videoUrl),
        transcriptStatus,
      };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error.status === 400 || error.status === 404)
      ) {
        throw error;
      }
      console.error('Error fetching transcript:', error);
      throw new InternalServerErrorException('Failed to fetch transcript');
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
          reviewer: {
            select: {
              id: true,
              fullName: true,
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
        console.log(
          `[TestimonyService] Approving testimony ${testimony.id}, triggering AI processing...`,
        );
        void this.testimonyAiService
          .processTestimony(testimony.id)
          .catch((err) => {
            console.error(
              `[TestimonyService] Failed to enqueue AI processing for testimony ${testimony.id}:`,
              err,
            );
            if (err instanceof Error) {
              console.error('Error details:', err.message, err.stack);
            }
          });
      } else {
        // Clean up connections when rejected or set to pending
        await this.prisma.testimonyEdge.deleteMany({
          where: { OR: [{ fromId: id }, { toId: id }] },
        });
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

  /**
   * Manually trigger AI processing (transcription + embeddings) for a testimony
   * Useful for retrying failed processing or processing approved testimonies that were missed
   */
  // ========== Semantic Search ==========

  async semanticSearch(query: string, limit = 10) {
    // Embed the search query using the same provider as testimonies
    const vectors = await this.embeddingProvider.embedSections([
      { section: 'query', text: query },
    ]);

    const queryVector = vectors['query'];
    if (!queryVector || queryVector.length === 0) {
      return { data: [], meta: { query, limit, total: 0 } };
    }

    // Find testimonies with similar embeddings using cosine similarity
    // Using raw SQL for vector similarity computation
    const results = await this.prisma.$queryRawUnsafe<
      Array<{
        testimony_id: number;
        similarity: number;
        section: string;
      }>
    >(
      `
      SELECT te."testimonyId" AS testimony_id,
             te.section,
             (
               SELECT SUM(a * b) / (
                 SQRT(SUM(a * a)) * SQRT(SUM(b * b))
               )
               FROM unnest(te.vector) WITH ORDINALITY AS t1(a, ord)
               JOIN unnest($1::float8[]) WITH ORDINALITY AS t2(b, ord) ON t1.ord = t2.ord
             ) AS similarity
      FROM testimony_embeddings te
      JOIN testimonies t ON t.id = te."testimonyId"
      WHERE t.status = 'approved' AND t."isPublished" = true
      ORDER BY similarity DESC
      LIMIT $2
      `,
      queryVector,
      limit * 3, // Get extra to deduplicate across sections
    );

    // Deduplicate by testimony_id, keeping highest similarity
    const seen = new Map<number, number>();
    for (const r of results) {
      const existing = seen.get(r.testimony_id);
      if (!existing || r.similarity > existing) {
        seen.set(r.testimony_id, r.similarity);
      }
    }

    // Get top results
    const topIds = [...seen.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    if (topIds.length === 0) {
      return { data: [], meta: { query, limit, total: 0 } };
    }

    // Fetch full testimony data
    const testimonies = await this.prisma.testimony.findMany({
      where: {
        id: { in: topIds.map(([id]) => id) },
        status: 'approved',
        isPublished: true,
      },
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        user: {
          select: { id: true, fullName: true, residentPlace: true },
        },
      },
    });

    // Map and sort by similarity score
    const idToSimilarity = new Map(topIds);
    const data = testimonies
      .map((t) => ({
        id: t.id,
        eventTitle: t.eventTitle,
        eventDescription: t.eventDescription,
        summary: t.summary,
        location: t.location,
        submissionType: t.submissionType,
        createdAt: t.createdAt,
        images: (t.images ?? []).map((img) => ({
          imageUrl: img.imageUrl,
          description: img.description ?? null,
        })),
        similarityScore: Math.round((idToSimilarity.get(t.id) ?? 0) * 100),
        user:
          t.identityPreference === 'public'
            ? { fullName: t.user?.fullName ?? t.fullName ?? null }
            : null,
      }))
      .sort((a, b) => b.similarityScore - a.similarityScore);

    return { data, meta: { query, limit, total: data.length } };
  }

  // ========== Admin Analytics ==========

  async getAnalytics() {
    const [
      totalTestimonies,
      approvedCount,
      pendingCount,
      rejectedCount,
      draftCount,
      totalUsers,
      totalConnections,
      avgConnectionScore,
      submissionTypeCounts,
      recentWeekCount,
    ] = await Promise.all([
      this.prisma.testimony.count(),
      this.prisma.testimony.count({ where: { status: 'approved' } }),
      this.prisma.testimony.count({ where: { status: 'pending' } }),
      this.prisma.testimony.count({ where: { status: 'rejected' } }),
      this.prisma.testimony.count({ where: { isDraft: true } }),
      this.prisma.user.count(),
      this.prisma.testimonyEdge.count(),
      this.prisma.testimonyEdge.aggregate({ _avg: { score: true } }),
      this.prisma.testimony.groupBy({
        by: ['submissionType'],
        _count: { id: true },
      }),
      this.prisma.testimony.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      testimonies: {
        total: totalTestimonies,
        approved: approvedCount,
        pending: pendingCount,
        rejected: rejectedCount,
        drafts: draftCount,
        lastWeek: recentWeekCount,
        byType: submissionTypeCounts.reduce(
          (acc, item) => {
            acc[item.submissionType] = item._count.id;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
      users: { total: totalUsers },
      connections: {
        total: totalConnections,
        averageScore: avgConnectionScore._avg.score
          ? Math.round(avgConnectionScore._avg.score * 100)
          : 0,
      },
    };
  }

  // ========== Duplicate Detection ==========

  async checkDuplicates(testimonyId: number) {
    const testimony = await this.prisma.testimony.findUnique({
      where: { id: testimonyId },
      select: { id: true, eventTitle: true, eventDescription: true },
    });

    if (!testimony) {
      throw new NotFoundException('Testimony not found');
    }

    // Find potential duplicates by title similarity
    const potentials = await this.prisma.testimony.findMany({
      where: {
        id: { not: testimonyId },
        status: { not: 'rejected' },
        OR: [
          {
            eventTitle: { contains: testimony.eventTitle, mode: 'insensitive' },
          },
          ...(testimony.eventDescription
            ? [
                {
                  eventDescription: {
                    contains: testimony.eventDescription.slice(0, 100),
                    mode: 'insensitive' as const,
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        eventTitle: true,
        eventDescription: true,
        fullName: true,
        status: true,
        createdAt: true,
      },
      take: 10,
    });

    return {
      testimonyId,
      duplicateCount: potentials.length,
      potentialDuplicates: potentials,
    };
  }

  // ========== Trending & Most Connected ==========

  async getTrending(limit = 10) {
    const testimonies = await this.prisma.testimony.findMany({
      where: { status: 'approved', isPublished: true },
      orderBy: { impressions: 'desc' },
      take: limit,
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        user: {
          select: { id: true, fullName: true, residentPlace: true },
        },
        _count: {
          select: { edgesFrom: true },
        },
      },
    });

    return testimonies.map((t) => ({
      id: t.id,
      eventTitle: t.eventTitle,
      eventDescription: t.eventDescription,
      summary: t.summary,
      location: t.location,
      submissionType: t.submissionType,
      impressions: t.impressions,
      connectionsCount: t._count.edgesFrom,
      createdAt: t.createdAt,
      images: (t.images ?? []).map((img) => ({
        imageUrl: img.imageUrl,
        description: img.description ?? null,
      })),
      user:
        t.identityPreference === 'public'
          ? { fullName: t.user?.fullName ?? t.fullName ?? null }
          : null,
    }));
  }

  async getMostConnected(limit = 10) {
    // Get testimonies with most connections
    const edgeCounts = await this.prisma.testimonyEdge.groupBy({
      by: ['fromId'],
      _count: { id: true },
      _avg: { score: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    if (edgeCounts.length === 0) return [];

    const testimonies = await this.prisma.testimony.findMany({
      where: {
        id: { in: edgeCounts.map((e) => e.fromId) },
        status: 'approved',
        isPublished: true,
      },
      include: {
        images: { orderBy: { order: 'asc' }, take: 1 },
        user: {
          select: { id: true, fullName: true, residentPlace: true },
        },
      },
    });

    const countMap = new Map(
      edgeCounts.map((e) => [
        e.fromId,
        { count: e._count.id, avgScore: e._avg.score },
      ]),
    );

    return testimonies
      .map((t) => ({
        id: t.id,
        eventTitle: t.eventTitle,
        eventDescription: t.eventDescription,
        summary: t.summary,
        location: t.location,
        submissionType: t.submissionType,
        impressions: t.impressions,
        connectionsCount: countMap.get(t.id)?.count ?? 0,
        averageConnectionScore: Math.round(
          (countMap.get(t.id)?.avgScore ?? 0) * 100,
        ),
        createdAt: t.createdAt,
        images: (t.images ?? []).map((img) => ({
          imageUrl: img.imageUrl,
          description: img.description ?? null,
        })),
        user:
          t.identityPreference === 'public'
            ? { fullName: t.user?.fullName ?? t.fullName ?? null }
            : null,
      }))
      .sort((a, b) => b.connectionsCount - a.connectionsCount);
  }

  // ========== Bookmarks ==========

  async addBookmark(userId: number, testimonyId: number, notes?: string) {
    const testimony = await this.prisma.testimony.findUnique({
      where: { id: testimonyId },
    });
    if (!testimony) {
      throw new NotFoundException('Testimony not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await (this.prisma as any).userBookmark.upsert({
      where: { userId_testimonyId: { userId, testimonyId } },
      update: { notes },
      create: { userId, testimonyId, notes },
    });
  }

  async removeBookmark(userId: number, testimonyId: number) {
    try {
      await (this.prisma as any).userBookmark.delete({
        where: { userId_testimonyId: { userId, testimonyId } },
      });
      return { message: 'Bookmark removed' };
    } catch {
      throw new NotFoundException('Bookmark not found');
    }
  }

  async getBookmarks(userId: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await (this.prisma as any).userBookmark.findMany({
      where: { userId },
      include: {
        testimony: {
          include: {
            images: { orderBy: { order: 'asc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ========== Reporting / Flagging ==========

  async reportTestimony(
    reportedBy: number,
    testimonyId: number,
    reason: string,
    details?: string,
  ) {
    const testimony = await this.prisma.testimony.findUnique({
      where: { id: testimonyId },
    });
    if (!testimony) {
      throw new NotFoundException('Testimony not found');
    }

    const validReasons = [
      'inappropriate',
      'false_info',
      'harmful',
      'duplicate',
      'other',
    ];
    if (!validReasons.includes(reason)) {
      throw new BadRequestException(
        `Invalid reason. Must be one of: ${validReasons.join(', ')}`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await (this.prisma as any).testimonyReport.create({
      data: { testimonyId, reportedBy, reason, details },
    });
  }

  async getReports(status?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await (this.prisma as any).testimonyReport.findMany({
      where,
      include: {
        testimony: {
          select: { id: true, eventTitle: true, status: true },
        },
        reporter: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveReport(reportId: number, status: string, adminNotes?: string) {
    const validStatuses = ['investigating', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await (this.prisma as any).testimonyReport.update({
        where: { id: reportId },
        data: {
          status,
          adminNotes,
          resolvedAt:
            status === 'resolved' || status === 'dismissed'
              ? new Date()
              : undefined,
        },
      });
    } catch {
      throw new NotFoundException('Report not found');
    }
  }

  // ========== Input Sanitization ==========

  private sanitizeHtml(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  sanitizeInput(dto: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeHtml(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  async triggerAiProcessing(testimonyId: number, adminId: number) {
    if (!testimonyId || testimonyId <= 0) {
      throw new BadRequestException('Invalid testimony ID');
    }

    if (!adminId || adminId <= 0) {
      throw new BadRequestException('Invalid admin ID');
    }

    try {
      const testimony = await this.prisma.testimony.findUnique({
        where: { id: testimonyId },
        select: {
          id: true,
          status: true,
          submissionType: true,
          audioUrl: true,
          videoUrl: true,
          transcript: true,
        },
      });

      if (!testimony) {
        throw new NotFoundException('Testimony not found');
      }

      // Check if testimony can be processed
      const canHaveTranscript =
        testimony.submissionType === 'audio' ||
        testimony.submissionType === 'video';
      const hasMedia = !!(testimony.audioUrl || testimony.videoUrl);

      if (!canHaveTranscript) {
        throw new BadRequestException(
          'Written testimonies do not require transcription',
        );
      }

      if (!hasMedia) {
        throw new BadRequestException(
          'Testimony has no media files (audio/video) to transcribe',
        );
      }

      console.log(
        `[TestimonyService] Manually triggering AI processing for testimony ${testimonyId} (admin: ${adminId})`,
      );
      console.log(
        `[TestimonyService] Testimony status: ${testimony.status}, hasTranscript: ${!!testimony.transcript}, hasMedia: ${hasMedia}`,
      );

      // Trigger AI processing
      await this.testimonyAiService.processTestimony(testimonyId);

      return {
        message: 'AI processing triggered successfully',
        testimonyId,
        status: testimony.status,
        hasTranscript: !!testimony.transcript,
        willProcess: true,
      };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error.status === 400 || error.status === 404)
      ) {
        throw error;
      }
      console.error('Error triggering AI processing:', error);
      throw new InternalServerErrorException('Failed to trigger AI processing');
    }
  }
}
