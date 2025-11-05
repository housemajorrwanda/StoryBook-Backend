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
import { CreateVirtualTourDto } from './dto/create-virtual-tour.dto';
import { UpdateVirtualTourDto } from './dto/update-virtual-tour.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UploadService } from '../upload/upload.service';
import { TourType } from './dto/create-virtual-tour.dto';

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
      { name: 'audioFiles', maxCount: 10 },
      { name: 'imageFiles', maxCount: 10 },
    ]),
  )
  @ApiOperation({
    summary: 'Create a new virtual tour with optional files (Admin only)',
    description:
      'Accepts multipart/form-data with files or application/json with URLs. If files are provided, they will be uploaded to Cloudinary.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        location: { type: 'string' },
        tourType: {
          type: 'string',
          enum: ['embed', '360_image', '360_video', '3d_model'],
        },
        embedUrl: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'published', 'archived'] },
        isPublished: { type: 'boolean' },
        hotspots: {
          type: 'string',
          description: 'JSON string of hotspots array',
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
      },
      required: ['title', 'location', 'tourType'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Virtual tour created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async create(
    @Request() req,
    @UploadedFiles()
    files: {
      tourFile?: Express.Multer.File[];
      audioFiles?: Express.Multer.File[];
      imageFiles?: Express.Multer.File[];
    },
    @Body() body: Record<string, unknown> | CreateVirtualTourDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id;

    // Parse JSON strings from form data
    let hotspots = body.hotspots;
    let audioRegions = body.audioRegions;
    let effects = body.effects;

    if (typeof hotspots === 'string') {
      try {
        hotspots = JSON.parse(hotspots);
      } catch {
        hotspots = [];
      }
    }

    if (typeof audioRegions === 'string') {
      try {
        audioRegions = JSON.parse(audioRegions);
      } catch {
        audioRegions = [];
      }
    }

    if (typeof effects === 'string') {
      try {
        effects = JSON.parse(effects);
      } catch {
        effects = [];
      }
    }

    // Handle file uploads
    const tourType =
      typeof body.tourType === 'string' ? body.tourType : undefined;

    // Upload main tour file if provided
    if (files?.tourFile?.[0] && tourType) {
      const tourFileResult = await this.uploadService.uploadVirtualTour(
        files.tourFile[0],
        tourType as '360_image' | '3d_model' | '360_video',
      );

      if (tourType === '360_image') {
        body.image360Url = tourFileResult.url;
      } else if (tourType === '360_video') {
        body.video360Url = tourFileResult.url;
      } else if (tourType === '3d_model') {
        body.model3dUrl = tourFileResult.url;
      }
      body.fileName = tourFileResult.fileName;
    }

    // Upload audio files and update hotspots/audioRegions
    if (files?.audioFiles && files.audioFiles.length > 0) {
      const audioUploadPromises = files.audioFiles.map((file) =>
        this.uploadService.uploadAudio(file),
      );
      const audioResults = await Promise.all(audioUploadPromises);

      // If audioRegions are provided, update them with uploaded URLs
      if (Array.isArray(audioRegions) && audioRegions.length > 0) {
        audioRegions = audioRegions.map((region: unknown, index: number) => {
          const regionObj = region as Record<string, unknown>;
          return {
            ...regionObj,
            audioUrl: audioResults[index]?.url || regionObj.audioUrl,
            audioFileName:
              audioResults[index]?.fileName || regionObj.audioFileName,
          };
        });
      }
    }

    // Upload image files and update hotspots
    if (files?.imageFiles && files.imageFiles.length > 0) {
      const imageUploadResult = await this.uploadService.uploadMultipleImages(
        files.imageFiles,
      );

      // Update hotspots with uploaded image URLs
      if (Array.isArray(hotspots) && hotspots.length > 0) {
        let imageIndex = 0;
        hotspots = hotspots.map((hotspot: unknown) => {
          const hotspotObj = hotspot as Record<string, unknown>;
          if (
            hotspotObj.type === 'image' &&
            imageUploadResult.successful[imageIndex]
          ) {
            const result = imageUploadResult.successful[imageIndex++];
            return {
              ...hotspotObj,
              actionImageUrl: result.url,
            };
          }
          return hotspotObj;
        });
      }
    }

    // Build the DTO
    const createVirtualTourDto: CreateVirtualTourDto = {
      title: typeof body.title === 'string' ? body.title : '',
      description:
        typeof body.description === 'string' ? body.description : undefined,
      location: typeof body.location === 'string' ? body.location : '',
      tourType: (tourType as TourType) || TourType.EMBED,
      embedUrl: typeof body.embedUrl === 'string' ? body.embedUrl : undefined,
      image360Url:
        typeof body.image360Url === 'string' ? body.image360Url : undefined,
      video360Url:
        typeof body.video360Url === 'string' ? body.video360Url : undefined,
      model3dUrl:
        typeof body.model3dUrl === 'string' ? body.model3dUrl : undefined,
      fileName: typeof body.fileName === 'string' ? body.fileName : undefined,
      status: typeof body.status === 'string' ? body.status : 'draft',
      isPublished:
        typeof body.isPublished === 'boolean'
          ? body.isPublished
          : body.isPublished === 'true'
            ? true
            : false,
      hotspots: Array.isArray(hotspots) ? hotspots : undefined,
      audioRegions: Array.isArray(audioRegions) ? audioRegions : undefined,
      effects: Array.isArray(effects) ? effects : undefined,
    };

    return this.virtualTourService.create(
      userId as number,
      createVirtualTourDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all virtual tours with filters',
  })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'tourType', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean })
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
      isPublished:
        isPublished !== undefined ? isPublished === 'true' : undefined,
    };
    return this.virtualTourService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a virtual tour by ID',
  })
  @ApiParam({ name: 'id', type: Number })
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
  @ApiOperation({ summary: 'Update a virtual tour (Admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Virtual tour updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateVirtualTourDto: UpdateVirtualTourDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id;
    return this.virtualTourService.update(
      id,
      userId as number,
      updateVirtualTourDto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a virtual tour (Admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 204,
    description: 'Virtual tour deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id;
    return this.virtualTourService.remove(id, userId as number);
  }
}
