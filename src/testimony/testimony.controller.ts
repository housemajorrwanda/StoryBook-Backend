import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
  Res,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Response } from 'express';
import axios from 'axios';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { TestimonyService } from './testimony.service';
import { UploadService } from '../upload/upload.service';
import { TestimonyConnectionService } from '../ai-processing/testimony-connection.service';
import { TestimonyAiService } from '../ai-processing/testimony-ai.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFiles } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import {
  CreateTestimonyDto,
  SubmissionType,
  IdentityPreference,
  RelationToEvent,
} from './dto/create-testimony.dto';
import { UpdateTestimonyDto } from './dto/update-testimony.dto';
import { TestimonyResponseDto } from './dto/testimony-response.dto';
import { TestimonyComparisonDto } from './dto/testimony-comparison.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { User } from '../user/user.types';
import { TestimonyIdPipe } from '../common/pipes/testimony-id.pipe';

@ApiTags('Testimonies')
@Controller('testimonies')
export class TestimonyController {
  constructor(
    private readonly testimonyService: TestimonyService,
    private readonly uploadService: UploadService,
    private readonly connectionService: TestimonyConnectionService,
    private readonly aiService: TestimonyAiService,
  ) {}

  private getAuthenticatedUserId(req: {
    user?: User & { role?: string; fullName?: string };
  }): number {
    const userId = req.user?.id;
    if (!userId || userId <= 0) {
      throw new UnauthorizedException('Authentication is required');
    }
    return userId;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create testimony with optional files (authentication required)',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 10 },
      { name: 'audio', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        submissionType: { type: 'string', enum: ['written', 'audio', 'video'] },
        identityPreference: { type: 'string', enum: ['public', 'anonymous'] },
        fullName: { type: 'string' },
        relationToEvent: {
          type: 'string',
          enum: [
            'Survivor',
            'Witness',
            'Family Member',
            'Friend',
            'Community Member',
            'Other',
          ],
        },
        relatives: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              relativeTypeId: { type: 'number' },
              personName: { type: 'string' },
              notes: { type: 'string' },
              order: { type: 'number' },
            },
            required: ['relativeTypeId', 'personName'],
          },
        },
        location: { type: 'string' },
        dateOfEventFrom: { type: 'string', format: 'date' },
        dateOfEventTo: { type: 'string', format: 'date' },
        eventTitle: { type: 'string' },
        eventDescription: { type: 'string' },
        fullTestimony: { type: 'string' },
        isDraft: { type: 'boolean' },
        draftCursorPosition: { type: 'number' },
        agreedToTerms: { type: 'boolean' },
        images: { type: 'array', items: { type: 'string', format: 'binary' } },
        audio: { type: 'string', format: 'binary' },
        video: { type: 'string', format: 'binary' },
      },
      required: [
        'submissionType',
        'identityPreference',
        'eventTitle',
        'agreedToTerms',
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Testimony created successfully',
    type: TestimonyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Request() req: { user: User & { role?: string; fullName?: string } },
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      audio?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
    @Body() body: Record<string, unknown> | CreateTestimonyDto,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    // Safely parse enums from body
    const submissionTypeCandidate =
      typeof body.submissionType === 'string' ? body.submissionType : undefined;
    const identityPreferenceCandidate =
      typeof body.identityPreference === 'string'
        ? body.identityPreference
        : undefined;

    const submissionType = Object.values(SubmissionType).includes(
      (submissionTypeCandidate as SubmissionType) ?? ('' as SubmissionType),
    )
      ? (submissionTypeCandidate as SubmissionType)
      : undefined;

    const identityPreference = Object.values(IdentityPreference).includes(
      (identityPreferenceCandidate as IdentityPreference) ??
        ('' as IdentityPreference),
    )
      ? (identityPreferenceCandidate as IdentityPreference)
      : undefined;

    const relationMap = {
      survivor: RelationToEvent.SURVIVOR,
      witness: RelationToEvent.WITNESS,
      family_member: RelationToEvent.FAMILY_MEMBER,
      community_member: RelationToEvent.COMMUNITY_MEMBER,
      rescuer: RelationToEvent.RESCUER,
      other: RelationToEvent.OTHER,
    } as const satisfies Record<string, RelationToEvent>;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const relationToEvent: RelationToEvent | undefined =
      typeof body.relationToEvent === 'string'
        ? (relationMap[String(body.relationToEvent).toLowerCase()] ?? undefined)
        : undefined;

    const dto: CreateTestimonyDto = {
      submissionType: submissionType as SubmissionType,
      identityPreference: identityPreference as IdentityPreference,
      fullName: typeof body.fullName === 'string' ? body.fullName : undefined,
      relationToEvent,
      relatives: (() => {
        const relativesData = body.relatives;
        if (!relativesData) return undefined;
        if (typeof relativesData === 'string') {
          try {
            const parsed = JSON.parse(relativesData) as unknown;
            return Array.isArray(parsed)
              ? (parsed as Array<{
                  relativeTypeId?: number;
                  personName?: string;
                  notes?: string;
                  order?: number;
                }>)
              : undefined;
          } catch {
            return undefined;
          }
        }
        if (Array.isArray(relativesData)) {
          return relativesData as Array<{
            relativeTypeId?: number;
            personName?: string;
            notes?: string;
            order?: number;
          }>;
        }
        return undefined;
      })(),
      location: typeof body.location === 'string' ? body.location : undefined,
      dateOfEventFrom:
        typeof body.dateOfEventFrom === 'string'
          ? new Date(body.dateOfEventFrom)
          : undefined,
      dateOfEventTo:
        typeof body.dateOfEventTo === 'string'
          ? new Date(body.dateOfEventTo)
          : undefined,
      eventTitle:
        typeof body.eventTitle === 'string' ? body.eventTitle : ('' as string),
      eventDescription:
        typeof body.eventDescription === 'string'
          ? body.eventDescription
          : undefined,
      fullTestimony:
        typeof body.fullTestimony === 'string' ? body.fullTestimony : undefined,
      isDraft:
        typeof body.isDraft === 'boolean'
          ? body.isDraft
          : body.isDraft === 'true'
            ? true
            : body.isDraft === 'false'
              ? false
              : undefined,
      draftCursorPosition:
        typeof body.draftCursorPosition === 'number'
          ? body.draftCursorPosition
          : typeof body.draftCursorPosition === 'string'
            ? Number.parseInt(String(body.draftCursorPosition), 10)
            : undefined,
      agreedToTerms:
        body.agreedToTerms === true || body.agreedToTerms === 'true',
      images: undefined,
      audioUrl: undefined,
      audioFileName: undefined,
      audioDuration: undefined,
      videoUrl: undefined,
      videoFileName: undefined,
      videoDuration: undefined,
    };

    // Upload images if provided
    const imageFiles = files?.images;
    if (imageFiles && Array.isArray(imageFiles) && imageFiles.length > 0) {
      try {
        const uploaded =
          await this.uploadService.uploadMultipleImages(imageFiles);

        // Check if any uploads failed
        if (uploaded.failed.length > 0) {
          console.warn(
            `[Testimony] Some images failed to upload:`,
            uploaded.failed.map((f) => `  - ${f.fileName}: ${f.error}`),
          );
        }

        // Check if all uploads failed
        if (uploaded.successful.length === 0) {
          console.error(
            `[Testimony] All image uploads failed for testimony. Details:`,
            uploaded.failed.map((f) => `  - ${f.fileName}: ${f.error}`),
          );
          console.error(
            `[Testimony] Testimony will be created without images. Check Cloudinary configuration and file validation.`,
          );
        } else {
          const rawDescriptions =
            (body as Record<string, unknown>)['imagesDescriptions'] ??
            (body as Record<string, unknown>)['imageDescriptions'];

          let descriptions: string[] = [];
          if (Array.isArray(rawDescriptions)) {
            descriptions = rawDescriptions
              .map((d) => (typeof d === 'string' ? d : ''))
              .map((d) => d.trim())
              .map((d) => (d.length > 500 ? d.slice(0, 500) : d));
          } else if (typeof rawDescriptions === 'string') {
            // Try to parse as JSON string first
            try {
              const parsed = JSON.parse(rawDescriptions.trim()) as unknown;
              if (Array.isArray(parsed)) {
                descriptions = parsed
                  .map((d) => (typeof d === 'string' ? d : ''))
                  .map((d) => d.trim())
                  .map((d) => (d.length > 500 ? d.slice(0, 500) : d));
              } else if (typeof parsed === 'string') {
                // Single string description
                descriptions = [
                  parsed.length > 500 ? parsed.slice(0, 500) : parsed,
                ];
              }
            } catch {
              // Not JSON, treat as single string description
              const d = rawDescriptions.trim();
              descriptions =
                d.length > 0 ? [d.length > 500 ? d.slice(0, 500) : d] : [];
            }
          }

          dto.images = uploaded.successful.map((img, index) => ({
            imageUrl: img.url,
            imageFileName: img.fileName,
            description:
              typeof descriptions[index] === 'string' &&
              descriptions[index].length
                ? descriptions[index]
                : undefined,
            order: index,
          }));
        }
      } catch (error) {
        console.error('[Testimony] Error uploading images:', error);
        if (error instanceof Error) {
          console.error(`[Testimony] Error message: ${error.message}`);
          console.error(`[Testimony] Error stack: ${error.stack}`);
        }
        console.error(
          `[Testimony] Testimony will be created without images due to upload error.`,
        );
      }
    } else {
      if (!files?.images) {
        // No images field in files object
      } else if (!Array.isArray(files.images)) {
        console.warn(
          `[Testimony] Images field is not an array: ${typeof files.images}`,
        );
      } else if (files.images.length === 0) {
        console.warn(`[Testimony] Images array is empty`);
      }
    }

    // Upload audio if submissionType is audio and file present
    if (dto.submissionType === SubmissionType.AUDIO && files?.audio?.[0]) {
      const a = await this.uploadService.uploadAudio(files.audio[0]);
      dto.audioUrl = a.url;
      dto.audioFileName = a.fileName;
      dto.audioDuration = a.duration;
    }

    // Upload video if submissionType is video and file present
    if (dto.submissionType === SubmissionType.VIDEO && files?.video?.[0]) {
      const v = await this.uploadService.uploadVideo(files.video[0]);
      dto.videoUrl = v.url;
      dto.videoFileName = v.fileName;
      dto.videoDuration = v.duration;
    }

    return this.testimonyService.create(userId, dto);
  }

  @Get()
  @SkipThrottle()
  @ApiOperation({
    summary: 'Get all testimonies with pagination and optional filters',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of items to skip (default: 0)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max items to return (default: 10)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in eventTitle, eventDescription, or fullName',
  })
  @ApiQuery({
    name: 'submissionType',
    required: false,
    enum: ['written', 'audio', 'video'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'rejected'],
  })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Filter from date (ISO format)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Filter to date (ISO format)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of testimonies',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/TestimonyResponseDto' },
        },
        meta: {
          type: 'object',
          properties: {
            skip: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
          },
        },
      },
    },
  })
  async findAll(
    @Request() req: { user?: User & { role?: string; fullName?: string } },
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('submissionType') submissionType?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('isPublished') isPublished?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const filters: {
      skip?: number;
      limit?: number;
      search?: string;
      submissionType?: string;
      status?: string;
      userId?: number;
      isPublished?: boolean;
      dateFrom?: string;
      dateTo?: string;
    } = {};

    if (skip) filters.skip = parseInt(skip, 10);
    if (limit) filters.limit = parseInt(limit, 10);
    if (search) filters.search = search;
    if (submissionType) filters.submissionType = submissionType;
    if (status) filters.status = status;
    if (userId) filters.userId = parseInt(userId, 10);
    if (isPublished !== undefined) filters.isPublished = isPublished === 'true';
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    return this.testimonyService.findAll(filters);
  }

  @Get('my-testimonies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user testimonies' })
  @ApiResponse({
    status: 200,
    description: 'List of user testimonies',
    type: [TestimonyResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findMyTestimonies(
    @Request() req: { user: User & { role?: string; fullName?: string } },
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.testimonyService.findUserTestimonies(userId);
  }

  @Get('drafts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all draft testimonies for authenticated user',
    description:
      'Returns all draft testimonies for the authenticated user, ordered by last saved date.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of draft testimonies',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/TestimonyResponseDto' },
        },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDrafts(
    @Request() req: { user: User & { role?: string; fullName?: string } },
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return await this.testimonyService.getDrafts(userId);
  }

  // ========== Semantic Search ==========
  @Get('search/semantic')
  @SkipThrottle()
  @ApiOperation({
    summary: 'AI-powered semantic search across testimonies',
    description:
      'Uses embedding vectors to find testimonies semantically similar to the search query. More accurate than keyword search for finding related content.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query text',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max results (default: 10)',
  })
  @ApiResponse({ status: 200, description: 'Semantic search results' })
  async semanticSearch(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    if (!query || query.trim().length === 0) {
      return { data: [], meta: { query: '', limit: 10, total: 0 } };
    }
    const take = limit ? Math.min(50, Math.max(1, parseInt(limit, 10))) : 10;
    return this.testimonyService.semanticSearch(query, take);
  }

  // ========== Admin Analytics ==========
  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[Admin] Dashboard analytics',
    description:
      'Returns aggregate statistics: testimony counts by status/type, user count, connection stats, recent activity.',
  })
  @ApiResponse({ status: 200, description: 'Analytics data' })
  async getAnalytics() {
    return this.testimonyService.getAnalytics();
  }

  // ========== Admin Reports ==========

  @Get('admin/reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Admin] Get all testimony reports' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'investigating', 'resolved', 'dismissed'],
  })
  @ApiResponse({ status: 200, description: 'List of reports' })
  async getReports(@Query('status') status?: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.testimonyService.getReports(status);
  }

  // ========== Admin AI Pipeline Tools ==========

  @Get('admin/ai/pending-transcriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[Admin] List testimonies awaiting transcription',
    description:
      'Returns approved audio/video testimonies that have no transcript yet, with status and error details.',
  })
  @ApiResponse({ status: 200, description: 'Pending transcriptions' })
  async getPendingTranscriptions() {
    return await this.aiService.getPendingTranscriptions();
  }

  @Get('admin/ai/pending-embeddings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[Admin] List testimonies with missing/failed embeddings',
  })
  @ApiResponse({ status: 200, description: 'Pending embeddings' })
  async getPendingEmbeddings() {
    return await this.aiService.getPendingEmbeddings();
  }

  @Get('admin/ai/failures')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[Admin] List all AI processing failures',
    description:
      'Shows all failed transcriptions and embeddings with error codes and attempt counts.',
  })
  @ApiResponse({ status: 200, description: 'AI failure report' })
  async getAiFailures() {
    return await this.aiService.getAiFailures();
  }

  @Post('admin/ai/process-batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Admin] Batch process all pending transcriptions and embeddings',
    description:
      'Queues up to 50 testimonies for AI processing with concurrency control (max 5 concurrent).',
  })
  @ApiResponse({ status: 200, description: 'Batch processing started' })
  async processBatch() {
    return await this.aiService.processBatch();
  }

  @Post('admin/ai/retry-failed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Admin] Retry all failed transcriptions',
    description:
      'Resets failed transcription status and re-queues them. Only retries testimonies with fewer than 5 total attempts.',
  })
  @ApiResponse({ status: 200, description: 'Retry started' })
  async retryFailedTranscriptions() {
    return await this.aiService.retryFailedTranscriptions();
  }

  // ========== Trending & Most Connected ==========
  @Get('trending')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Get trending testimonies by impressions',
    description: 'Returns the most viewed approved testimonies.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max results (default: 10)',
  })
  @ApiResponse({ status: 200, description: 'Trending testimonies' })
  async getTrending(@Query('limit') limit?: string) {
    const take = limit ? Math.min(50, Math.max(1, parseInt(limit, 10))) : 10;
    return this.testimonyService.getTrending(take);
  }

  @Get('most-connected')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Get testimonies with the most AI connections',
    description:
      'Returns testimonies that have the most connections to other testimonies, indicating central or highly relevant stories.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max results (default: 10)',
  })
  @ApiResponse({ status: 200, description: 'Most connected testimonies' })
  async getMostConnected(@Query('limit') limit?: string) {
    const take = limit ? Math.min(50, Math.max(1, parseInt(limit, 10))) : 10;
    return this.testimonyService.getMostConnected(take);
  }

  // ========== Bookmarks ==========

  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all bookmarked testimonies for current user' })
  @ApiResponse({ status: 200, description: 'User bookmarks' })
  async getBookmarks(
    @Request() req: { user: User & { role?: string; fullName?: string } },
  ) {
    const userId = this.getAuthenticatedUserId(req);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.testimonyService.getBookmarks(userId);
  }

  @Get(':id')
  @SkipThrottle()
  @ApiOperation({
    summary:
      'Get a single testimony by ID or slug. Supports formats: "1" or "1-testimony-title". Includes resume progress if logged in and AI connections if available.',
    description:
      'Returns a single testimony with all its details. If AI connections exist for this testimony, they will be included in the response under the `connections` field. Each connection shows related testimonies with accuracy scores, connection reasons, and contact information (email, name, location) if the connected testimony author chose "public" identity preference.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description:
      'Testimony ID or slug format (e.g., "1" or "1-voices-that-refuse-silence")',
  })
  @ApiQuery({
    name: 'progress',
    required: false,
    type: Number,
    description:
      'Update resume position (seconds) - only works if authenticated',
  })
  @ApiQuery({
    name: 'connectionsLimit',
    required: false,
    type: Number,
    description:
      'Maximum number of AI connections to return (default: 10, max: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Testimony details with resume progress if user is logged in',
    type: TestimonyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Testimony not found',
  })
  async findOne(
    @Param('id', TestimonyIdPipe) id: number,
    @Request() req: { user?: User & { role?: string; fullName?: string } },
    @Query('progress') progress?: string,
    @Query('connectionsLimit') connectionsLimit?: string,
  ) {
    const userId = req.user?.id;
    const progressSeconds = progress ? parseInt(progress, 10) : undefined;
    const connectionsLimitNum = connectionsLimit
      ? Math.min(50, Math.max(1, parseInt(connectionsLimit, 10)))
      : 10;
    return this.testimonyService.findOne(
      id,
      userId,
      progressSeconds,
      connectionsLimitNum,
    );
  }

  @Get(':id/transcript/stream')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Stream live transcription for a testimony (Server-Sent Events)',
    description:
      'Returns a Server-Sent Events (SSE) stream of transcription segments as they are generated. Useful for displaying live transcription with word-level highlighting synchronized with audio playback. Frontend can use EventSource API to receive real-time updates.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'SSE stream of transcription segments',
    headers: {
      'Content-Type': { description: 'text/event-stream' },
    },
  })
  @ApiResponse({ status: 404, description: 'Testimony not found' })
  async streamTranscript(
    @Param('id', TestimonyIdPipe) id: number,
    @Res() res: Response,
  ) {
    const testimony = await this.testimonyService.findOne(id);

    if (!testimony) {
      throw new NotFoundException('Testimony not found');
    }

    const mediaUrl = testimony.audioUrl ?? testimony.videoUrl;
    if (!mediaUrl) {
      throw new NotFoundException('Testimony has no media file');
    }

    // Forward to transcription service streaming endpoint
    const transcriptionBaseUrl = process.env.AI_TRANSCRIBE_URL;
    if (!transcriptionBaseUrl) {
      throw new InternalServerErrorException(
        'Transcription service not configured',
      );
    }

    const transcriptionUrl = transcriptionBaseUrl.replace(
      '/transcribe',
      '/transcribe/stream',
    );

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { data: stream } = await axios.post(
        transcriptionUrl,
        { audioUrl: mediaUrl },
        { responseType: 'stream' },
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      stream.pipe(res);
    } catch {
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: 'Failed to start transcription stream' })}\n\n`,
      );
      res.end();
    }
  }

  @Get(':id/transcript')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Get transcript for a testimony',
    description:
      'Returns the transcript text for audio or video testimonies. Returns detailed status information including whether transcription is complete, pending, or unavailable.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'The testimony ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Transcript retrieved successfully with status information',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        transcript: {
          type: 'string',
          nullable: true,
          description: 'The transcript text (null if not available)',
        },
        hasTranscript: {
          type: 'boolean',
          description: 'Whether transcript exists',
        },
        submissionType: {
          type: 'string',
          description: 'Type of testimony (written, audio, video)',
        },
        canHaveTranscript: {
          type: 'boolean',
          description: 'Whether this testimony type can have a transcript',
        },
        hasMedia: {
          type: 'boolean',
          description: 'Whether media file (audio/video) exists',
        },
        transcriptStatus: {
          type: 'string',
          description:
            'Status message: "available", "pending - transcription is processing...", "unavailable - no media file found", or "not applicable - written testimonies do not have transcripts"',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Testimony not found' })
  async getTranscript(@Param('id', TestimonyIdPipe) id: number) {
    return await this.testimonyService.getTranscript(id);
  }

  @Get(':id/comparison')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get comparison between current and previous published version',
    description:
      'Returns current editable version and previous published version for side-by-side comparison. Accessible by testimony owner or admin.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Comparison data with current and previous versions',
    type: TestimonyComparisonDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not your testimony and not admin',
  })
  @ApiResponse({ status: 404, description: 'Testimony not found' })
  async getComparison(
    @Param('id', TestimonyIdPipe) id: number,
    @Request() req: { user: User & { role?: string; fullName?: string } },
  ) {
    const userId = this.getAuthenticatedUserId(req);
    const userRole = req.user.role;
    return this.testimonyService.getComparison(id, userId, userRole);
  }

  @Get('connections/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[Admin] Get connection quality statistics based on user ratings',
    description:
      'Shows avg scores, avg user ratings, and counts per connection type. Useful for tuning AI thresholds.',
  })
  @ApiResponse({ status: 200, description: 'Connection quality statistics' })
  async getConnectionStats() {
    return this.connectionService.getConnectionQualityStats();
  }

  @Get('connections/warnings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[Admin] Get warnings about low-quality connection types',
    description:
      'Identifies connection types that users consistently rate poorly (below 3.0/5 with 10+ ratings). Includes actionable recommendations for threshold tuning.',
  })
  @ApiResponse({
    status: 200,
    description: 'Low-quality connection warnings',
  })
  async getConnectionWarnings() {
    return await this.connectionService.getLowQualityConnectionWarnings();
  }

  @Get('connections/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: "Get AI connections for the logged-in user's testimonies",
    description:
      "Returns all AI-discovered connections where the logged-in user's testimonies are the source. Shows which other testimonies are related to yours and why.",
  })
  @ApiResponse({
    status: 200,
    description: "Connections for the user's testimonies",
  })
  async getMyConnections(
    @Request() req: { user: User & { role?: string; fullName?: string } },
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.testimonyService.getMyConnections(userId);
  }

  @Get('connections/all')
  @SkipThrottle()
  @ApiOperation({
    summary: 'Get all AI connections in the system',
    description: `Returns all connections between testimonies discovered by AI. The AI analyzes testimonies using two methods:

**1. Semantic Similarity (AI-Powered):**
- Analyzes testimony content (title, description, fullTestimony, transcript) using embeddings
- Finds testimonies with similar themes, topics, and content
- Uses cosine similarity on vector embeddings (threshold: 70%+ similarity)

**2. Rule-Based Connections:**
- **Same Event**: Testimonies about the same event (score: 90%)
- **Same Location**: Testimonies from the same location (score: 80%)
- **Same Person**: Testimonies mentioning the same person (score: 85%)
- **Same Person + Same Relationship Type**: Same person with same relationship (score: 90%)
- **Same Relation to Event**: Both are "Survivor", "Witness", etc. (score: 75%)
- **Same Date**: Occurred on exact same date (score: 95%)
- **Same Month**: Same month and year (score: 80%)
- **Same Year**: Same year (score: 70%)
- **Overlapping Dates**: Date ranges overlap (score: 60-75%)
- **Nearby Dates**: Within 30 days of each other (score: 50-70%)

Each connection includes an accuracy score (0-100) indicating connection strength.`,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max connections to return (default: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'All connections sorted by connection strength',
  })
  async getAllConnections(@Query('limit') limit?: string) {
    const take = limit ? parseInt(limit, 10) : 50;
    return this.testimonyService.getAllConnections(take);
  }

  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bookmark a testimony' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { notes: { type: 'string', nullable: true } },
    },
  })
  @ApiResponse({ status: 200, description: 'Testimony bookmarked' })
  async addBookmark(
    @Param('id', TestimonyIdPipe) id: number,
    @Request() req: { user: User & { role?: string; fullName?: string } },
    @Body() body: { notes?: string },
  ) {
    const userId = this.getAuthenticatedUserId(req);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.testimonyService.addBookmark(userId, id, body.notes);
  }

  @Delete(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a bookmark' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Bookmark removed' })
  async removeBookmark(
    @Param('id', TestimonyIdPipe) id: number,
    @Request() req: { user: User & { role?: string; fullName?: string } },
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.testimonyService.removeBookmark(userId, id);
  }

  // ========== Reporting / Flagging ==========

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Report/flag a testimony',
    description:
      'Report a testimony for review. Reasons: inappropriate, false_info, harmful, duplicate, other.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          enum: [
            'inappropriate',
            'false_info',
            'harmful',
            'duplicate',
            'other',
          ],
        },
        details: { type: 'string', nullable: true },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({ status: 201, description: 'Report created' })
  async reportTestimony(
    @Param('id', TestimonyIdPipe) id: number,
    @Request() req: { user: User & { role?: string; fullName?: string } },
    @Body() body: { reason: string; details?: string },
  ) {
    const userId = this.getAuthenticatedUserId(req);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.testimonyService.reportTestimony(
      userId,
      id,
      body.reason,
      body.details,
    );
  }

  @Patch('admin/reports/:reportId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Admin] Resolve a testimony report' })
  @ApiParam({ name: 'reportId', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['investigating', 'resolved', 'dismissed'],
        },
        adminNotes: { type: 'string', nullable: true },
      },
      required: ['status'],
    },
  })
  @ApiResponse({ status: 200, description: 'Report updated' })
  async resolveReport(
    @Param('reportId') reportId: string,
    @Body() body: { status: string; adminNotes?: string },
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.testimonyService.resolveReport(
      parseInt(reportId, 10),
      body.status,
      body.adminNotes,
    );
  }

  // ========== Duplicate Detection ==========

  @Get(':id/duplicates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[Admin] Check for duplicate testimonies',
    description:
      'Finds testimonies with similar titles or descriptions that may be duplicates.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Potential duplicates' })
  async checkDuplicates(@Param('id', TestimonyIdPipe) id: number) {
    return this.testimonyService.checkDuplicates(id);
  }

  @Post(':id/discover-connections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Admin] Manually trigger connection discovery for a testimony',
    description:
      'Forces the system to discover and create connections between this testimony and others. Useful for re-analyzing connections after updates or when AI services become available.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'The testimony ID to discover connections for',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection discovery started',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        testimonyId: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Testimony not found',
  })
  async discoverConnections(@Param('id', TestimonyIdPipe) id: number) {
    // Verify testimony exists
    try {
      await this.testimonyService.findOne(id);
    } catch {
      throw new NotFoundException('Testimony not found');
    }

    // Trigger connection discovery (non-blocking)
    void this.connectionService.discoverConnections(id).catch((error) => {
      console.error(`Connection discovery failed for testimony ${id}:`, error);
    });

    return {
      message: 'Connection discovery started. This may take a few moments.',
      testimonyId: id,
    };
  }

  @Post('connections/:edgeId/rate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rate a connection quality (1-5 stars)',
    description:
      'Allows users to rate how relevant a connection is. Helps improve future AI accuracy.',
  })
  @ApiParam({ name: 'edgeId', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { rating: { type: 'number', minimum: 1, maximum: 5 } },
      required: ['rating'],
    },
  })
  @ApiResponse({ status: 200, description: 'Connection rated' })
  async rateConnection(
    @Param('edgeId') edgeId: string,
    @Body() body: { rating: number },
  ) {
    return this.connectionService.rateConnection(
      parseInt(edgeId, 10),
      body.rating,
    );
  }

  @Post('connections/rebuild-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[Admin] Re-discover connections for all approved testimonies',
    description:
      'Clears all existing connections and rebuilds them from scratch. This is a heavy operation.',
  })
  @ApiResponse({ status: 200, description: 'Rebuild started' })
  async rebuildAllConnections() {
    const testimonies = await this.testimonyService.getApprovedTestimonyIds();

    // Clear all existing edges
    await this.testimonyService.clearAllConnections();

    // Trigger discovery for each (non-blocking)
    let count = 0;
    for (const t of testimonies) {
      void this.connectionService.discoverConnections(t.id).catch((err) => {
        console.error(
          `Rebuild: connection discovery failed for testimony ${t.id}:`,
          err,
        );
      });
      count++;
    }

    return {
      message: `Connection rebuild started for ${count} testimonies. User-rated connections will be preserved. This may take a few minutes.`,
      totalTestimonies: count,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a testimony' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Testimony updated successfully',
    type: TestimonyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only update own testimonies',
  })
  @ApiResponse({
    status: 404,
    description: 'Testimony not found',
  })
  async update(
    @Param('id', TestimonyIdPipe) id: number,
    @Request() req: { user: User & { role?: string; fullName?: string } },
    @Body() updateTestimonyDto: UpdateTestimonyDto,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.testimonyService.update(id, userId, updateTestimonyDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a testimony' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Testimony deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only delete own testimonies',
  })
  @ApiResponse({
    status: 404,
    description: 'Testimony not found',
  })
  async remove(
    @Param('id', TestimonyIdPipe) id: number,
    @Request() req: { user: User & { role?: string; fullName?: string } },
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.testimonyService.remove(id, userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update testimony status (admin only).',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
    type: TestimonyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - invalid status or missing required feedback/reason',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Testimony not found',
  })
  async updateStatus(
    @Param('id', TestimonyIdPipe) id: number,
    @Request() req: { user: User & { role?: string; fullName?: string } },
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.testimonyService.updateStatus(
      id,
      updateStatusDto.status,
      userId,
      updateStatusDto.feedback,
    );
  }

  @Post(':id/process-ai')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Manually trigger AI processing for a testimony (admin only)',
    description:
      'Manually trigger transcription and embedding generation for a testimony. Useful for retrying failed processing or processing approved testimonies that were missed.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'AI processing triggered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request - testimony cannot be processed',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Testimony not found',
  })
  async triggerAiProcessing(
    @Param('id', TestimonyIdPipe) id: number,
    @Request() req: { user: User & { role?: string; fullName?: string } },
  ) {
    const userId = this.getAuthenticatedUserId(req);
    return this.testimonyService.triggerAiProcessing(id, userId);
  }

  // ========== Relative Types Admin CRUD ==========

  @Get('relative-types')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get all available relative/relationship types' })
  @ApiResponse({ status: 200, description: 'List of all relative types' })
  async getRelativeTypes() {
    return this.testimonyService.getRelativeTypes();
  }

  @Post('relative-types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Admin] Create a new relative type' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        slug: { type: 'string', example: 'step-mother' },
        displayName: { type: 'string', example: 'Step Mother' },
        synonyms: {
          type: 'string',
          example: 'stepmom,step mom',
          nullable: true,
        },
      },
      required: ['slug', 'displayName'],
    },
  })
  @ApiResponse({ status: 201, description: 'Relative type created' })
  async createRelativeType(
    @Body() body: { slug: string; displayName: string; synonyms?: string },
  ) {
    return this.testimonyService.createRelativeType(body);
  }

  @Patch('relative-types/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Admin] Update a relative type' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        displayName: { type: 'string' },
        synonyms: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Relative type updated' })
  async updateRelativeType(
    @Param('id') id: string,
    @Body() body: { slug?: string; displayName?: string; synonyms?: string },
  ) {
    return this.testimonyService.updateRelativeType(parseInt(id, 10), body);
  }

  @Delete('relative-types/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Admin] Delete a relative type' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Relative type deleted' })
  async deleteRelativeType(@Param('id') id: string) {
    return this.testimonyService.deleteRelativeType(parseInt(id, 10));
  }
}
