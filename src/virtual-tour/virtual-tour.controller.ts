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
import { VirtualTourService } from './virtual-tour.service';
import { CreateVirtualTourDto } from './dto/create-virtual-tour.dto';
import { UpdateVirtualTourDto } from './dto/update-virtual-tour.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Virtual Tours')
@Controller('virtual-tours')
export class VirtualTourController {
  constructor(private readonly virtualTourService: VirtualTourService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new virtual tour with interactive elements (Admin only)',
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
    @Body() createVirtualTourDto: CreateVirtualTourDto,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.virtualTourService.create(
      userId as number,
      createVirtualTourDto,
    );
  }

  @Get()
  @ApiOperation({
    summary:
      'Get all virtual tours with filters (Public - No authentication required)',
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
