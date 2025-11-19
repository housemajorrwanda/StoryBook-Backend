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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { VirtualTourService } from './virtual-tour.service';
import { CreateVirtualTourDto, TourStatus, TourType } from './dto/create-virtual-tour.dto';
import { UpdateVirtualTourDto } from './dto/update-virtual-tour.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UploadService } from '../upload/upload.service';

interface UploadedTourFiles {
  tourFile?: Express.Multer.File[];
  audioFiles?: Express.Multer.File[];
  imageFiles?: Express.Multer.File[];
  videoFiles?: Express.Multer.File[];
  hotspotAudioFiles?: Express.Multer.File[];
  hotspotImageFiles?: Express.Multer.File[];
  hotspotVideoFiles?: Express.Multer.File[];
  effectSoundFiles?: Express.Multer.File[];
}

@ApiTags('Virtual Tours')
@Controller('virtual-tours')
export class VirtualTourController {
  constructor(
    private readonly virtualTourService: VirtualTourService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'tourFile', maxCount: 1 },
      { name: 'audioFiles', maxCount: 20 },
      { name: 'hotspotAudioFiles', maxCount: 20 },
      { name: 'hotspotImageFiles', maxCount: 20 },
      { name: 'hotspotVideoFiles', maxCount: 10 },
      { name: 'effectSoundFiles', maxCount: 20 },
    ]),
  )
  @ApiOperation({
    summary: 'Create a new virtual tour with optional nested elements (Admin only)',
    description:
      'Create virtual tour with hotspots, audio regions, and effects. Accepts multipart/form-data with files or application/json with URLs.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Museum Virtual Tour' },
        description: { type: 'string', example: 'Explore our museum collection' },
        location: { type: 'string', example: 'National Museum, City Center' },
        tourType: {
          type: 'string',
          enum: ['embed', '360_image', '360_video', '3d_model'],
          example: '360_image',
        },
        embedUrl: { type: 'string', example: 'https://matterport.com/tour/123' },
        status: { type: 'string', enum: ['draft', 'published', 'archived'], default: 'draft' },
        isPublished: { type: 'boolean', default: false },
        tourFile: {
          type: 'string',
          format: 'binary',
          description: 'Main tour file (360 image, 3D model, or 360 video)',
        },
        hotspots: {
          type: 'string',
          description: 'JSON array of hotspot configurations',
          example: JSON.stringify([
            {
              positionX: 0,
              positionY: 1.5,
              positionZ: -5,
              type: 'info',
              title: 'Information Point',
              description: 'Details about this location',
            },
          ]),
        },
        audioRegions: {
          type: 'string',
          description: 'JSON array of audio region configurations',
          example: JSON.stringify([
            {
              regionType: 'sphere',
              centerX: 0,
              centerY: 0,
              centerZ: 0,
              radius: 5,
              volume: 0.8,
              loop: true,
            },
          ]),
        },
        effects: {
          type: 'string',
          description: 'JSON array of effect configurations',
          example: JSON.stringify([
            {
              effectType: 'visual',
              triggerType: 'on_enter',
              effectName: 'fog',
              intensity: 0.5,
            },
          ]),
        },
        audioFiles: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Audio files for audio regions (matched by array index)',
        },
        hotspotAudioFiles: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Audio files for hotspots with type "audio"',
        },
        hotspotImageFiles: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Image files for hotspots with type "image"',
        },
        hotspotVideoFiles: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Video files for hotspots with type "video"',
        },
        effectSoundFiles: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Sound files for effects with effectType "sound"',
        },
      },
      required: ['title', 'location', 'tourType'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Virtual tour created successfully with nested elements',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async create(
    @Request() req,
    @UploadedFiles() files: UploadedTourFiles,
    @Body() body: Record<string, unknown>,
  ) {
    const userId = req.user.id as number;

    // Parse nested data from form
    const hotspots = this.parseJsonField(body.hotspots, 'hotspots');
    const audioRegions = this.parseJsonField(body.audioRegions, 'audioRegions');
    const effects = this.parseJsonField(body.effects, 'effects');

    const tourType = this.getStringField(body.tourType, 'tourType', true)!;

    // Process main tour file
    await this.processMainTourFile(files, tourType, body);

    // Process audio region files
    const processedAudioRegions = await this.processAudioRegionFiles(
      audioRegions,
      files.audioFiles,
    );

    // Process hotspot files
    const processedHotspots = await this.processHotspotFiles(
      hotspots,
      files.hotspotAudioFiles,
      files.hotspotImageFiles,
      files.hotspotVideoFiles,
    );

    // Process effect files
    const processedEffects = await this.processEffectFiles(
      effects,
      files.effectSoundFiles,
    );

    // Build the DTO
    const createVirtualTourDto: CreateVirtualTourDto = {
      title: this.getStringField(body.title, 'title', true)!,
      description: this.getStringField(body.description, 'description'),
      location: this.getStringField(body.location, 'location', true)!,
      tourType: tourType as TourType,
      embedUrl: this.getStringField(body.embedUrl, 'embedUrl'),
      image360Url: this.getStringField(body.image360Url, 'image360Url'),
      video360Url: this.getStringField(body.video360Url, 'video360Url'),
      model3dUrl: this.getStringField(body.model3dUrl, 'model3dUrl'),
      fileName: this.getStringField(body.fileName, 'fileName'),
      status: this.getStringField(body.status, 'status') as TourStatus || TourStatus.PUBLISHED,
      isPublished: this.getBooleanField(body.isPublished, 'isPublished'),
    };

    return this.virtualTourService.createWithNested(
      userId,
      createVirtualTourDto,
      processedHotspots,
      processedAudioRegions,
      processedEffects,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all virtual tours with optional filters',
    description: 'Retrieve a paginated list of virtual tours with optional search and filtering',
  })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Number of records to skip' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum records to return' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in title, description, location' })
  @ApiQuery({ name: 'tourType', required: false, enum: ['embed', '360_image', '360_video', '3d_model'] })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'archived'] })
  @ApiQuery({ name: 'userId', required: false, type: Number, description: 'Filter by user ID' })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean, description: 'Filter by published status' })
  @ApiResponse({
    status: 200,
    description: 'Virtual tours retrieved successfully',
  })
  async findAll(
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('tourType') tourType?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('isPublished') isPublished?: string,
  ) {
    const filters = {
      skip: skip ? parseInt(skip, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      tourType,
      status,
      userId: userId ? parseInt(userId, 10) : undefined,
      isPublished: isPublished !== undefined ? isPublished === 'true' : undefined,
    };
    return this.virtualTourService.findAll(filters);
  }

  @Get('my-tours')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user\'s virtual tours',
    description: 'Retrieve all virtual tours created by the authenticated user',
  })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'archived'] })
  @ApiResponse({
    status: 200,
    description: 'User tours retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyTours(
    @Request() req,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const userId = req.user.id as number;
    const filters = {
      skip: skip ? parseInt(skip, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      status,
    };
    return this.virtualTourService.getUserTours(userId, filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a virtual tour by ID',
    description: 'Retrieve detailed information about a specific virtual tour',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Virtual tour ID' })
  @ApiResponse({
    status: 200,
    description: 'Virtual tour retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.virtualTourService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a virtual tour (Admin only)',
    description: 'Update virtual tour details',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Virtual tour updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - You can only update your own tours' })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateVirtualTourDto: UpdateVirtualTourDto,
  ) {
    const userId = req.user.id as number;
    return this.virtualTourService.update(id, userId, updateVirtualTourDto);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Publish a virtual tour (Admin only)',
    description: 'Set tour status to published and make it publicly visible',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Virtual tour published successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async publish(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user.id as number;
    return this.virtualTourService.publish(id, userId);
  }

  @Patch(':id/unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Unpublish a virtual tour (Admin only)',
    description: 'Set tour status to draft and remove from public view',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Virtual tour unpublished successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async unpublish(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user.id as number;
    return this.virtualTourService.unpublish(id, userId);
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Archive a virtual tour (Admin only)',
    description: 'Set tour status to archived',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Virtual tour archived successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async archive(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user.id as number;
    return this.virtualTourService.archive(id, userId);
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Increment tour view count',
    description: 'Track when a user views the virtual tour',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'View count incremented successfully',
  })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async incrementView(@Param('id', ParseIntPipe) id: number) {
    return this.virtualTourService.incrementImpressions(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a virtual tour (Admin only)',
    description: 'Permanently delete a virtual tour and all associated data',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 204,
    description: 'Virtual tour deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - You can only delete your own tours' })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user.id as number;
    return this.virtualTourService.remove(id, userId);
  }

  // ==================== FILE PROCESSING METHODS ====================

  /**
   * Process and upload main tour file based on tour type
   */
  private async processMainTourFile(
    files: UploadedTourFiles,
    tourType: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    if (!files?.tourFile?.[0]) return;

    const tourFile = files.tourFile[0];
    const tourFileResult = await this.uploadService.uploadVirtualTour(
      tourFile,
      tourType as '360_image' | '3d_model' | '360_video',
    );

    // Map uploaded URL to appropriate field
    switch (tourType) {
      case '360_image':
        body.image360Url = tourFileResult.url;
        break;
      case '360_video':
        body.video360Url = tourFileResult.url;
        break;
      case '3d_model':
        body.model3dUrl = tourFileResult.url;
        break;
    }
    body.fileName = tourFileResult.fileName;
  }

  /**
   * Process and upload audio region files
   */
  private async processAudioRegionFiles(
    audioRegions: any[] | undefined,
    audioFiles: Express.Multer.File[] | undefined,
  ): Promise<any[] | undefined> {
    if (!audioRegions || !Array.isArray(audioRegions)) {
      return undefined;
    }

    if (!audioFiles || audioFiles.length === 0) {
      return audioRegions;
    }

    // Upload all audio files
    const audioResults = await Promise.all(
      audioFiles.map((file) => this.uploadService.uploadAudio(file)),
    );

    // Map uploaded files to audio regions by index
    return audioRegions.map((region, index) => {
      if (audioResults[index]) {
        return {
          ...region,
          audioUrl: audioResults[index].url,
          audioFileName: audioResults[index].fileName,
        };
      }
      return region;
    });
  }

  /**
   * Process and upload hotspot-related files (audio, image, video)
   */
  private async processHotspotFiles(
    hotspots: any[] | undefined,
    audioFiles: Express.Multer.File[] | undefined,
    imageFiles: Express.Multer.File[] | undefined,
    videoFiles: Express.Multer.File[] | undefined,
  ): Promise<any[] | undefined> {
    if (!hotspots || !Array.isArray(hotspots)) {
      return undefined;
    }

    // Upload all files in parallel
    const [audioResults, imageResults, videoResults] = await Promise.all([
      audioFiles ? Promise.all(audioFiles.map((f) => this.uploadService.uploadAudio(f))) : [],
      imageFiles ? this.uploadService.uploadMultipleImages(imageFiles).then((r) => r.successful) : [],
      videoFiles ? Promise.all(videoFiles.map((f) => this.uploadService.uploadVideo(f))) : [],
    ]);

    // Track file indices for each type
    let audioIndex = 0;
    let imageIndex = 0;
    let videoIndex = 0;

    // Map files to corresponding hotspots based on type
    return hotspots.map((hotspot) => {
      const processed = { ...hotspot };

      switch (hotspot.type) {
        case 'audio':
          if (audioResults[audioIndex]) {
            processed.actionAudioUrl = audioResults[audioIndex].url;
            audioIndex++;
          }
          break;
        case 'image':
          if (imageResults[imageIndex]) {
            processed.actionImageUrl = imageResults[imageIndex].url;
            imageIndex++;
          }
          break;
        case 'video':
          if (videoResults[videoIndex]) {
            processed.actionVideoUrl = videoResults[videoIndex].url;
            videoIndex++;
          }
          break;
      }

      return processed;
    });
  }

  /**
   * Process and upload effect sound files
   */
  private async processEffectFiles(
    effects: any[] | undefined,
    soundFiles: Express.Multer.File[] | undefined,
  ): Promise<any[] | undefined> {
    if (!effects || !Array.isArray(effects)) {
      return undefined;
    }

    if (!soundFiles || soundFiles.length === 0) {
      return effects;
    }

    // Upload all sound files
    const soundResults = await Promise.all(
      soundFiles.map((file) => this.uploadService.uploadAudio(file)),
    );

    // Map uploaded files to sound effects
    let soundIndex = 0;
    return effects.map((effect) => {
      if (effect.effectType === 'sound' && soundResults[soundIndex]) {
        const result = soundResults[soundIndex++];
        return {
          ...effect,
          soundUrl: result.url,
        };
      }
      return effect;
    });
  }

  // ==================== HELPER METHODS ====================

  /**
   * Parse JSON field from form data or return array if already parsed
   */
  private parseJsonField(field: unknown, fieldName: string): any[] | undefined {
    if (field === undefined || field === null || field === '') {
      return undefined;
    }

    if (typeof field === 'string') {
      // Skip placeholder strings
      if (field.trim().toLowerCase() === 'string' || field.trim() === '') {
        return undefined;
      }

      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        throw new BadRequestException(
          `Invalid JSON format for ${fieldName}. Expected a JSON array or omit the field.`,
        );
      }
    }

    if (Array.isArray(field)) {
      return field;
    }

    return undefined;
  }

  /**
   * Extract and validate string field from request body
   */
  private getStringField(
    field: unknown,
    fieldName: string,
    required: boolean = false,
  ): string | undefined {
    if (field === undefined || field === null) {
      if (required) {
        throw new BadRequestException(`${fieldName} is required`);
      }
      return undefined;
    }

    if (typeof field === 'string') {
      return field;
    }

    throw new BadRequestException(`${fieldName} must be a string`);
  }

  /**
   * Extract and validate boolean field from request body
   */
  private getBooleanField(field: unknown, fieldName: string): boolean {
    if (field === undefined || field === null) {
      return false;
    }

    if (typeof field === 'boolean') {
      return field;
    }

    if (typeof field === 'string') {
      return field.toLowerCase() === 'true';
    }

    return false;
  }
}