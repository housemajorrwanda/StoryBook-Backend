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
import { CreateVirtualTourDto, TourType } from './dto/create-virtual-tour.dto';
import { UpdateVirtualTourDto } from './dto/update-virtual-tour.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UploadService } from '../upload/upload.service';

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
      { name: 'imageFiles', maxCount: 20 },
      { name: 'videoFiles', maxCount: 5 },
    ]),
  )
  @ApiOperation({
    summary: 'Create a new virtual tour with optional files (Admin only)',
    description:
      'Accepts multipart/form-data with files or application/json with URLs. Files are uploaded to Cloudinary.',
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
        hotspots: {
          type: 'string',
          description: 'JSON string of hotspots array',
          example: '[{"type":"info","title":"Artifact","positionX":1,"positionY":2,"positionZ":3}]',
        },
        audioRegions: {
          type: 'string',
          description: 'JSON string of audioRegions array',
        },
        effects: {
          type: 'string',
          description: 'JSON string of effects array',
        },
        tourFile: {
          type: 'string',
          format: 'binary',
          description: 'Main tour file (360 image, 3D model, or 360 video)',
        },
        audioFiles: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Audio files for hotspots/audio regions',
        },
        imageFiles: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Image files for hotspots',
        },
        videoFiles: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Video files for hotspots',
        },
      },
      required: ['title', 'location', 'tourType'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Virtual tour created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async create(
    @Request() req,
    @UploadedFiles()
    files: {
      tourFile?: Express.Multer.File[];
      audioFiles?: Express.Multer.File[];
      imageFiles?: Express.Multer.File[];
      videoFiles?: Express.Multer.File[];
    },
    @Body() body: Record<string, unknown>,
  ) {
    const userId = req.user.id as number;

    // Parse JSON strings from form data
    let hotspots = this.parseJsonField(body.hotspots, 'hotspots');
    let audioRegions = this.parseJsonField(body.audioRegions, 'audioRegions');
    let effects = this.parseJsonField(body.effects, 'effects');

    const tourType = typeof body.tourType === 'string' ? body.tourType : undefined;

    if (!tourType) {
      throw new BadRequestException('tourType is required');
    }

    // Upload main tour file if provided
    if (files?.tourFile?.[0]) {
      const tourFileResult = await this.uploadService.uploadVirtualTour(
        files.tourFile[0],
        tourType as '360_image' | '3d_model' | '360_video',
      );

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

    // Upload and map audio files
    if (files?.audioFiles && files.audioFiles.length > 0) {
      const audioResults = await Promise.all(
        files.audioFiles.map((file) => this.uploadService.uploadAudio(file))
      );

      // Map audio files to audio regions
      if (Array.isArray(audioRegions)) {
        audioRegions = audioRegions.map((region: any, index: number) => ({
          ...region,
          audioUrl: audioResults[index]?.url || region.audioUrl,
          audioFileName: audioResults[index]?.fileName || region.audioFileName,
        }));
      }

      // Map audio files to hotspots with audio type
      if (Array.isArray(hotspots)) {
        let audioIndex = audioRegions?.length || 0;
        hotspots = hotspots.map((hotspot: any) => {
          if (hotspot.type === 'audio' && audioResults[audioIndex]) {
            const result = audioResults[audioIndex++];
            return {
              ...hotspot,
              actionAudioUrl: result.url,
            };
          }
          return hotspot;
        });
      }
    }

    // Upload and map image files to hotspots
    if (files?.imageFiles && files.imageFiles.length > 0) {
      const imageUploadResult = await this.uploadService.uploadMultipleImages(files.imageFiles);

      if (Array.isArray(hotspots)) {
        let imageIndex = 0;
        hotspots = hotspots.map((hotspot: any) => {
          if (hotspot.type === 'image' && imageUploadResult.successful[imageIndex]) {
            const result = imageUploadResult.successful[imageIndex++];
            return {
              ...hotspot,
              actionImageUrl: result.url,
            };
          }
          return hotspot;
        });
      }
    }

    // Upload and map video files to hotspots
    if (files?.videoFiles && files.videoFiles.length > 0) {
      const videoResults = await Promise.all(
        files.videoFiles.map((file) => this.uploadService.uploadVideo(file))
      );

      if (Array.isArray(hotspots)) {
        let videoIndex = 0;
        hotspots = hotspots.map((hotspot: any) => {
          if (hotspot.type === 'video' && videoResults[videoIndex]) {
            const result = videoResults[videoIndex++];
            return {
              ...hotspot,
              actionVideoUrl: result.url,
            };
          }
          return hotspot;
        });
      }
    }

    // Build the DTO
    const createVirtualTourDto: CreateVirtualTourDto = {
      // title: this.getStringField(body.title, 'title', true),
      // description: this.getStringField(body.description, 'description'),
      // location: this.getStringField(body.location, 'location', true),

      title: this.getStringField(body.title, 'title', true)!,
      description: this.getStringField(body.description, 'description'),
      location: this.getStringField(body.location, 'location', true)!,
      tourType: tourType as TourType,
      embedUrl: this.getStringField(body.embedUrl, 'embedUrl'),
      image360Url: this.getStringField(body.image360Url, 'image360Url'),
      video360Url: this.getStringField(body.video360Url, 'video360Url'),
      model3dUrl: this.getStringField(body.model3dUrl, 'model3dUrl'),
      fileName: this.getStringField(body.fileName, 'fileName'),
      status: this.getStringField(body.status, 'status') || 'draft',
      isPublished: this.getBooleanField(body.isPublished, 'isPublished'),
      hotspots: hotspots,
      audioRegions: audioRegions,
      effects: effects,
    };

    return this.virtualTourService.create(userId, createVirtualTourDto);
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
    description: 'Update virtual tour details, hotspots, audio regions, and effects',
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

  // Helper methods
  private parseJsonField(field: unknown, fieldName: string): any[] | undefined {
    if (field === undefined || field === null || field === '') {
      return undefined;
    }

    if (typeof field === 'string') {
      // Skip parsing if it's a placeholder string like "string"
      if (field.trim().toLowerCase() === 'string' || field.trim() === '') {
        return undefined;
      }

      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        throw new BadRequestException(
          `Invalid JSON format for ${fieldName}. Expected a JSON array or omit the field.`
        );
      }
    }

    if (Array.isArray(field)) {
      return field;
    }

    return undefined;
  }

  private getStringField(field: unknown, fieldName: string, required: boolean = false): string | undefined {
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