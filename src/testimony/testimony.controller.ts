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
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { TestimonyService } from './testimony.service';
import { UploadService } from '../upload/upload.service';
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
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Testimonies')
@Controller('testimonies')
export class TestimonyController {
  constructor(
    private readonly testimonyService: TestimonyService,
    private readonly uploadService: UploadService,
  ) {}

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
    @Request() req: { user: { userId: number } },
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      audio?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
    @Body() body: Record<string, unknown> | CreateTestimonyDto,
  ) {
    const userId = req.user.userId;

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

    // Build DTO base from body with safe casts
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
      nameOfRelative:
        typeof body.nameOfRelative === 'string'
          ? body.nameOfRelative
          : undefined,
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
    if (files?.images && files.images.length > 0) {
      const uploaded = await this.uploadService.uploadMultipleImages(
        files.images,
      );

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
        const d = rawDescriptions.trim();
        descriptions = [d.length > 500 ? d.slice(0, 500) : d];
      }

      dto.images = uploaded.successful.map((img, index) => ({
        imageUrl: img.url,
        imageFileName: img.fileName,
        description:
          typeof descriptions[index] === 'string' && descriptions[index].length
            ? descriptions[index]
            : undefined,
        order: index,
      }));
      // If all failed, keep images undefined
      if (dto.images.length === 0) {
        dto.images = undefined;
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
    @Request() req: { user?: { userId: number; role?: string } },
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
    @Request() req: { user: { userId: number; role?: string } },
  ) {
    return this.testimonyService.findUserTestimonies(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get a single testimony by ID. Includes resume progress if logged in.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({
    name: 'progress',
    required: false,
    type: Number,
    description:
      'Update resume position (seconds) - only works if authenticated',
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
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user?: { userId: number } },
    @Query('progress') progress?: string,
  ) {
    const userId = req.user?.userId;
    const progressSeconds = progress ? parseInt(progress, 10) : undefined;
    return this.testimonyService.findOne(id, userId, progressSeconds);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related testimonies (stub for AI linking)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max items to return (default: 5)',
  })
  @ApiResponse({
    status: 200,
    description: 'Related testimonies',
    schema: {
      type: 'array',
      items: { $ref: '#/components/schemas/TestimonyResponseDto' },
    },
  })
  async getRelated(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? parseInt(limit, 10) : 5;
    return this.testimonyService.getRelated(id, take);
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
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number } },
    @Body() updateTestimonyDto: UpdateTestimonyDto,
  ) {
    return this.testimonyService.update(
      id,
      req.user.userId,
      updateTestimonyDto,
    );
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
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number } },
  ) {
    return this.testimonyService.remove(id, req.user.userId);
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
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number; role?: string } },
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.testimonyService.updateStatus(
      id,
      updateStatusDto.status,
      req.user.userId,
      updateStatusDto.feedback,
    );
  }
}
