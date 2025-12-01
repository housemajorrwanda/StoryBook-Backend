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
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Put,
} from '@nestjs/common';
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
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { EducationService } from './education.service';
import { UploadService } from '../upload/upload.service';
import {
  CreateEducationDto,
  ContentType,
  ContentCategory,
  ContentStatus,
} from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EducationResponseDto } from './dto/education-response.dto';

@ApiTags('Education')
@Controller('education')
export class EducationController {
  constructor(
    private readonly educationService: EducationService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create educational content with files' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        content: { type: 'string' },
        type: { type: 'string', enum: Object.values(ContentType) },
        category: { type: 'string', enum: Object.values(ContentCategory) },
        tags: { type: 'string', description: 'JSON array of tags' },
        status: { type: 'string', enum: Object.values(ContentStatus) },
        isPublished: { type: 'boolean' },
        image: { type: 'string', format: 'binary' },
        video: { type: 'string', format: 'binary' },
      },
      required: ['title', 'type'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Educational content created successfully',
    type: EducationResponseDto,
  })
  async create(
    @Request() req,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
    @Body() body: any,
  ) {
    const userId = req.user.id;

    // Parse tags if provided
    let tags: string[] = [];
    if (body.tags) {
      try {
        tags = JSON.parse(body.tags);
      } catch {
        tags = Array.isArray(body.tags) ? body.tags : [body.tags];
      }
    }

    const dto: CreateEducationDto = {
      title: body.title,
      description: body.description,
      content: body.content,
      type: body.type as ContentType,
      category: body.category as ContentCategory,
      tags,
      status: body.status,
      isPublished: body.isPublished === 'true',
    };

    // Upload image if provided
    if (files?.image?.[0]) {
      try {
        const uploadResult = await this.uploadService.uploadMultipleImages(
          files.image,
        );

        // Check if upload was successful
        if (uploadResult.successful.length > 0) {
          dto.imageUrl = uploadResult.successful[0].url;
        } else if (uploadResult.failed.length > 0) {
          // Handle upload failure
          throw new BadRequestException(
            `Image upload failed: ${uploadResult.failed[0].error}`,
          );
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Failed to upload image',
        );
      }
    }

    // Upload video if provided and type is video
    if (dto.type === ContentType.VIDEO && files?.video?.[0]) {
      try {
        const uploadedVideo = await this.uploadService.uploadVideo(
          files.video[0],
        );
        dto.videoUrl = uploadedVideo.url;
        dto.duration = uploadedVideo.duration;
      } catch (error) {
        console.error('Error uploading video:', error);
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Failed to upload video',
        );
      }
    }

    return this.educationService.create(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all educational content with pagination and filters',
  })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ContentType })
  @ApiQuery({ name: 'category', required: false, enum: ContentCategory })
  @ApiQuery({ name: 'status', required: false, enum: ContentStatus })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of educational content',
  })
  async findAll(
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: ContentType,
    @Query('category') category?: ContentCategory,
    @Query('status') status?: ContentStatus,
    @Query('isPublished') isPublished?: string,
  ) {
    const filters = {
      skip: skip ? parseInt(skip, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      type,
      category,
      status,
      isPublished: isPublished ? isPublished === 'true' : undefined,
    };

    return this.educationService.findAll(filters);
  }

  @Get('published')
  @ApiOperation({ summary: 'Get only published educational content' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'List of published educational content',
    type: [EducationResponseDto],
  })
  async findPublished(
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const filters = {
      skip: skip ? parseInt(skip, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    };

    return this.educationService.findPublished(filters);
  }

  @Get('popular')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get popular educational content (most viewed)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items to return',
  })
  @ApiResponse({
    status: 200,
    description: 'List of popular educational content',
    type: [EducationResponseDto],
  })
  async getPopular(@Request() req, @Query('limit') limit?: string) {
    const currentUserId = req.user?.id;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.educationService.getPopularContent(limitNum, currentUserId);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get educational content statistics' })
  @ApiResponse({
    status: 200,
    description: 'Content statistics',
  })
  async getStatistics() {
    return this.educationService.getContentStatistics();
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get educational content by category' })
  @ApiParam({ name: 'category', enum: ContentCategory })
  @ApiResponse({
    status: 200,
    description: 'List of educational content by category',
    type: [EducationResponseDto],
  })
  async findByCategory(@Param('category') category: ContentCategory) {
    return this.educationService.findByCategory(category);
  }

  @Get('my-content')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current admin educational content' })
  @ApiResponse({
    status: 200,
    description: 'List of admin educational content',
    type: [EducationResponseDto],
  })
  async findMyContent(@Request() req) {
    const userId = req.user.id;
    return this.educationService.findUserContent(userId);
  }

  @Get('my-progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user learning progress statistics' })
  @ApiResponse({
    status: 200,
    description: 'User learning progress',
  })
  async getUserLearningProgress(@Request() req) {
    const userId = req.user.id;
    return this.educationService.getUserLearningProgress(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get educational content by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Educational content details',
    type: EducationResponseDto,
  })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user?.id;
    return this.educationService.findOne(id, userId);
  }

  @Post(':id/view')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment view count for educational content' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'View count incremented successfully',
  })
  async incrementViews(@Param('id', ParseIntPipe) id: number) {
    await this.educationService.incrementViews(id);
    return { message: 'View count incremented successfully' };
  }

  @Post(':id/progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Track user progress for educational content' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        completed: { type: 'boolean', default: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User progress tracked successfully',
  })
  async trackUserProgress(
    @Param('id', ParseIntPipe) contentId: number,
    @Request() req,
    @Body('completed') completed?: boolean,
  ) {
    const userId = req.user.id;
    return this.educationService.trackUserProgress(
      userId,
      contentId,
      completed,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update educational content' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Educational content updated successfully',
    type: EducationResponseDto,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateDto: UpdateEducationDto,
  ) {
    const userId = req.user.id;
    return this.educationService.update(id, userId, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete educational content' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Educational content deleted successfully',
  })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user.id;
    return this.educationService.remove(id, userId);
  }
}