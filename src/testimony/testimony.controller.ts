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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApproveTestimonyDto,
  RejectTestimonyDto,
  ReportTestimonyDto,
  RequestFeedbackDto,
} from './dto/admin-action.dto';

@ApiTags('Testimonies')
@Controller('testimonies')
export class TestimonyController {
  constructor(
    private readonly testimonyService: TestimonyService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new testimony (authentication optional)' })
  @ApiResponse({
    status: 201,
    description: 'Testimony created successfully',
    type: TestimonyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @Post('multipart')
  @ApiOperation({
    summary: 'Create testimony with files and fields in one request',
  })
  @ApiConsumes('multipart/form-data')
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
        nameOfRelative: { type: 'string' },
        location: { type: 'string' },
        dateOfEvent: { type: 'string', format: 'date' },
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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 10 },
      { name: 'audio', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  @ApiResponse({
    status: 201,
    description: 'Testimony created successfully',
    type: TestimonyResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async createMultipart(
    @Request() req: { user?: { userId: number } },
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      audio?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
    @Body() body: Record<string, unknown>,
  ) {
    const userId = req.user?.userId || null;

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
      dateOfEvent:
        typeof body.dateOfEvent === 'string'
          ? new Date(body.dateOfEvent)
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
        body['imagesDescriptions'] ?? body['imageDescriptions'];

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
    summary:
      'Get all testimonies (public: only published approved, authenticated: all with filters)',
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
  @ApiResponse({
    status: 200,
    description: 'List of testimonies',
    type: [TestimonyResponseDto],
  })
  async findAll(
    @Request() req: { user?: { userId: number; role?: string } },
    @Query('submissionType') submissionType?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('isPublished') isPublished?: string,
  ) {
    const filters: {
      submissionType?: string;
      status?: string;
      userId?: number;
      isPublished?: boolean;
    } = {};

    if (submissionType) filters.submissionType = submissionType;
    if (status) filters.status = status;
    if (userId) filters.userId = parseInt(userId, 10);
    if (isPublished !== undefined) filters.isPublished = isPublished === 'true';

    const userRole = req.user?.role;
    return this.testimonyService.findAll(filters, userRole);
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
    return this.testimonyService.findUserTestimonies(
      req.user.userId,
      req.user.role,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single testimony by ID (public: only published approved)',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Testimony details',
    type: TestimonyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Testimony not found',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user?: { userId: number; role?: string } },
  ) {
    const userRole = req.user?.role;
    return this.testimonyService.findOne(id, userRole);
  }

  @Post(':id/impression')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment testimony impression count' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Impression count incremented',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        impressions: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Testimony not found',
  })
  async incrementImpression(@Param('id', ParseIntPipe) id: number) {
    return this.testimonyService.incrementImpression(id);
  }

  @Get(':id/impressions')
  @ApiOperation({ summary: 'Get testimony impression count' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Impression count',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        eventTitle: { type: 'string' },
        impressions: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Testimony not found',
  })
  async getImpressions(@Param('id', ParseIntPipe) id: number) {
    return this.testimonyService.getImpressions(id);
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
  @ApiOperation({ summary: 'Update testimony status (admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
    type: TestimonyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid status',
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
    @Body('status') status: string,
  ) {
    return this.testimonyService.updateStatus(id, status, req.user.userId);
  }

  @Patch(':id/toggle-publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle testimony publish status (admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Publish status toggled successfully',
    type: TestimonyResponseDto,
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
  async togglePublish(@Param('id', ParseIntPipe) id: number) {
    return this.testimonyService.togglePublish(id);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve testimony (admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Testimony approved successfully',
    type: TestimonyResponseDto,
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
  async approveTestimony(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number; role?: string } },
    @Body() approveDto: ApproveTestimonyDto,
  ) {
    return this.testimonyService.approveTestimony(
      id,
      req.user.userId,
      approveDto.feedback,
    );
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reject testimony (admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Testimony rejected successfully',
    type: TestimonyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - reason is required',
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
  async rejectTestimony(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number; role?: string } },
    @Body() rejectDto: RejectTestimonyDto,
  ) {
    return this.testimonyService.rejectTestimony(
      id,
      req.user.userId,
      rejectDto.reason,
    );
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Report testimony (admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Testimony reported successfully',
    type: TestimonyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - reason is required',
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
  async reportTestimony(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number; role?: string } },
    @Body() reportDto: ReportTestimonyDto,
  ) {
    return this.testimonyService.reportTestimony(
      id,
      req.user.userId,
      reportDto.reason,
    );
  }

  @Post(':id/request-feedback')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Request feedback from user (admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Feedback requested successfully',
    type: TestimonyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - message is required',
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
  async requestFeedback(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number; role?: string } },
    @Body() feedbackDto: RequestFeedbackDto,
  ) {
    return this.testimonyService.requestFeedback(
      id,
      req.user.userId,
      feedbackDto.message,
    );
  }
}
