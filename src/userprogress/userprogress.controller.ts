
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
import { UserProgressService } from './userprogress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserProgressResponseDto } from './dto/response-userprogress.dto';
import { CreateUserprogressDto, ProgressContentType } from './dto/create-userprogress.dto';
import { UpdateUserProgressDto } from './dto/update-userprogress.dto';

@ApiTags('User Progress')
@Controller('user-progress')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserProgressController {
  constructor(private readonly userProgressService: UserProgressService) {}

  @Post()
  @ApiOperation({ summary: 'Create or track user progress for content' })
  @ApiResponse({
    status: 201,
    description: 'User progress created successfully',
    type: UserProgressResponseDto,
  })
  async create(@Request() req, @Body() dto: CreateUserprogressDto) {
    const userId = req.user.id;
    return this.userProgressService.create(userId, dto);
  }

  @Post('update-or-create')
  @ApiOperation({ 
    summary: 'Update existing progress or create new if not exists',
    description: 'Useful for tracking progress without checking if record exists'
  })
  @ApiResponse({
    status: 200,
    description: 'User progress updated or created successfully',
    type: UserProgressResponseDto,
  })
  async updateOrCreate(@Request() req, @Body() dto: CreateUserprogressDto) {
    const userId = req.user.id;
    return this.userProgressService.updateOrCreate(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all progress records for current user' })
  @ApiQuery({ name: 'contentType', required: false, enum: ProgressContentType })
  @ApiQuery({ name: 'isCompleted', required: false, type: Boolean })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'List of user progress records',
    type: [UserProgressResponseDto],
  })
  async findAll(
    @Request() req,
    @Query('contentType') contentType?: ProgressContentType,
    @Query('isCompleted') isCompleted?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.id;
    const filters = {
      contentType,
      isCompleted: isCompleted ? isCompleted === 'true' : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    return this.userProgressService.findUserProgress(userId, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get user progress statistics' })
  @ApiResponse({
    status: 200,
    description: 'User progress statistics',
  })
  async getStatistics(@Request() req) {
    const userId = req.user.id;
    return this.userProgressService.getUserStatistics(userId);
  }

  @Get('content/:contentType/:contentId')
  @ApiOperation({ summary: 'Get progress for specific content' })
  @ApiParam({ name: 'contentType', enum: ProgressContentType })
  @ApiParam({ name: 'contentId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Progress for specific content',
    type: UserProgressResponseDto,
  })
  async findProgressForContent(
    @Request() req,
    @Param('contentType') contentType: ProgressContentType,
    @Param('contentId', ParseIntPipe) contentId: number,
  ) {
    const userId = req.user.id;
    return this.userProgressService.findProgressForContent(userId, contentType, contentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific progress record by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Progress record details',
    type: UserProgressResponseDto,
  })
  async findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.id;
    return this.userProgressService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update progress record' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Progress updated successfully',
    type: UserProgressResponseDto,
  })
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserProgressDto,
  ) {
    const userId = req.user.id;
    return this.userProgressService.update(id, userId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete progress record' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Progress record deleted successfully',
  })
  async remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.id;
    return this.userProgressService.delete(id, userId);
  }

  // Convenience endpoints for marking completion
  @Post('complete/:contentType/:contentId')
  @ApiOperation({ summary: 'Mark content as completed' })
  @ApiParam({ name: 'contentType', enum: ProgressContentType })
  @ApiParam({ name: 'contentId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Content marked as completed',
    type: UserProgressResponseDto,
  })
  async markComplete(
    @Request() req,
    @Param('contentType') contentType: ProgressContentType,
    @Param('contentId', ParseIntPipe) contentId: number,
    @Body() body?: { rating?: number; feedback?: string },
  ) {
    const userId = req.user.id;
    
    const dto: CreateUserprogressDto = {
      contentType,
      progress: 1.0,
      isCompleted: true,
      rating: body?.rating,
      feedback: body?.feedback,
    };

    // Set the appropriate content ID
    if (contentType === ProgressContentType.EDUCATION) {
      dto.educationId = contentId;
    } else if (contentType === ProgressContentType.TESTIMONY) {
      dto.testimonyId = contentId;
    } else if (contentType === ProgressContentType.SIMULATION) {
      dto.simulationId = contentId;
    }

    return this.userProgressService.updateOrCreate(userId, dto);
  }

  @Post('rate/:contentType/:contentId')
  @ApiOperation({ summary: 'Rate content' })
  @ApiParam({ name: 'contentType', enum: ProgressContentType })
  @ApiParam({ name: 'contentId', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Content rated successfully',
    type: UserProgressResponseDto,
  })
  async rateContent(
    @Request() req,
    @Param('contentType') contentType: ProgressContentType,
    @Param('contentId', ParseIntPipe) contentId: number,
    @Body() body: { rating: number; feedback?: string },
  ) {
    const userId = req.user.id;
    
    const dto: CreateUserprogressDto = {
      contentType,
      rating: body.rating,
      feedback: body.feedback,
    };

    // Set the appropriate content ID
    if (contentType === ProgressContentType.EDUCATION) {
      dto.educationId = contentId;
    } else if (contentType === ProgressContentType.TESTIMONY) {
      dto.testimonyId = contentId;
    } else if (contentType === ProgressContentType.SIMULATION) {
      dto.simulationId = contentId;
    }

    return this.userProgressService.updateOrCreate(userId, dto);
  }
}