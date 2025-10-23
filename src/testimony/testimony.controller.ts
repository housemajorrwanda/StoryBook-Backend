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
import { CreateTestimonyDto } from './dto/create-testimony.dto';
import { UpdateTestimonyDto } from './dto/update-testimony.dto';
import { TestimonyResponseDto } from './dto/testimony-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { 
  ApproveTestimonyDto, 
  RejectTestimonyDto, 
  ReportTestimonyDto, 
  RequestFeedbackDto 
} from './dto/admin-action.dto';

@ApiTags('Testimonies')
@Controller('testimonies')
export class TestimonyController {
  constructor(private readonly testimonyService: TestimonyService) {}

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
  async create(@Request() req, @Body() createTestimonyDto: CreateTestimonyDto) {
    // Allow both authenticated and anonymous submissions
    const userId = req.user?.userId || null;
    return this.testimonyService.create(userId, createTestimonyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all testimonies (with optional filters)' })
  @ApiQuery({ name: 'submissionType', required: false, enum: ['written', 'audio', 'video'] })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'List of testimonies',
    type: [TestimonyResponseDto],
  })
  async findAll(
    @Query('submissionType') submissionType?: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('isPublished') isPublished?: string,
  ) {
    const filters: any = {};

    if (submissionType) filters.submissionType = submissionType;
    if (status) filters.status = status;
    if (userId) filters.userId = parseInt(userId, 10);
    if (isPublished !== undefined) filters.isPublished = isPublished === 'true';

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
  async findMyTestimonies(@Request() req) {
    return this.testimonyService.findUserTestimonies(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single testimony by ID' })
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
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.testimonyService.findOne(id);
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
    @Request() req,
    @Body() updateTestimonyDto: UpdateTestimonyDto,
  ) {
    return this.testimonyService.update(id, req.user.userId, updateTestimonyDto);
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
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.testimonyService.remove(id, req.user.userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
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
    status: 404,
    description: 'Testimony not found',
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.testimonyService.updateStatus(id, status);
  }

  @Patch(':id/toggle-publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle testimony publish status' })
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
    description: 'Forbidden - can only publish own testimonies',
  })
  @ApiResponse({
    status: 404,
    description: 'Testimony not found',
  })
  async togglePublish(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.testimonyService.togglePublish(id, req.user.userId);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard)
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
    status: 404,
    description: 'Testimony not found',
  })
  async approveTestimony(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() approveDto: ApproveTestimonyDto,
  ) {
    return this.testimonyService.approveTestimony(id, req.user.userId, approveDto.feedback);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
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
    status: 404,
    description: 'Testimony not found',
  })
  async rejectTestimony(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() rejectDto: RejectTestimonyDto,
  ) {
    return this.testimonyService.rejectTestimony(id, req.user.userId, rejectDto.reason);
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
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
    status: 404,
    description: 'Testimony not found',
  })
  async reportTestimony(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() reportDto: ReportTestimonyDto,
  ) {
    return this.testimonyService.reportTestimony(id, req.user.userId, reportDto.reason);
  }

  @Post(':id/request-feedback')
  @UseGuards(JwtAuthGuard)
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
    status: 404,
    description: 'Testimony not found',
  })
  async requestFeedback(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() feedbackDto: RequestFeedbackDto,
  ) {
    return this.testimonyService.requestFeedback(id, req.user.userId, feedbackDto.message);
  }
}
