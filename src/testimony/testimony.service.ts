import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateTestimonyDto } from './dto/create-testimony.dto';
import { UpdateTestimonyDto } from './dto/update-testimony.dto';

@Injectable()
export class TestimonyService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
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

      // Re-throw HTTP exceptions (like BadRequestException from validation)
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }

      // Handle Prisma errors
      if (error && typeof error === 'object' && 'code' in error) {
        if (error.code === 'P2003') {
          throw new BadRequestException(
            'Invalid user ID - user does not exist',
          );
        }
        if (error.code === 'P2002') {
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
      const related = await this.prisma.testimony.findMany({
        where: {
          id: { not: id },
          status: 'approved',
          isPublished: true,
        },
        include: {
          images: { orderBy: { order: 'asc' } },
          user: { select: { id: true, fullName: true, residentPlace: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return related;
    } catch (error: unknown) {
      console.error('Error fetching related testimonies:', error);
      throw new InternalServerErrorException(
        'Failed to fetch related testimonies',
      );
    }
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

  async findOne(id: number, userId?: number, progressSeconds?: number) {
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

      return {
        ...testimony,
        impressions: testimony.impressions + 1,
        resumePosition: resumeProgress?.lastPositionSeconds || 0,
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

      // Notify owner via email on status changes
      try {
        const userEmail = (testimony as any)?.user?.email as string | undefined;
        if (userEmail) {
          await this.emailService.sendTestimonyStatusEmail({
            to: userEmail,
            status: status as 'approved' | 'rejected' | 'pending',
            feedback,
            testimonyTitle: testimony.eventTitle,
            testimonyId: testimony.id,
          });
        }
      } catch (notifyErr) {
        // Log but don't fail the request if email fails
        console.warn('Failed to send testimony status email:', notifyErr);
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
