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
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { VirtualTourService } from './virtual-tour.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateHotspotDto } from './dto/create-hotspot.dto';
import { UpdateHotspotDto } from './dto/update-hotspot.dto';
import { ReorderDto } from './dto/reorder.dto';


@ApiTags('Virtual Tour Hotspots')
@Controller('virtual-tours/:tourId/hotspots')
export class HotspotController {
  constructor(private readonly virtualTourService: VirtualTourService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new hotspot for a virtual tour' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiResponse({ status: 201, description: 'Hotspot created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async createHotspot(
    @Param('tourId', ParseIntPipe) virtualTourId: number,
    @Request() req,
    @Body() createHotspotDto: CreateHotspotDto,
  ) {
    const userId = req.user.id as number;
    return this.virtualTourService.createHotspot(virtualTourId, userId, createHotspotDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all hotspots for a virtual tour' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiResponse({ status: 200, description: 'Hotspots retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async getTourHotspots(@Param('tourId', ParseIntPipe) virtualTourId: number) {
    return this.virtualTourService.getTourHotspots(virtualTourId);
  }

  @Get(':hotspotId')
  @ApiOperation({ summary: 'Get a specific hotspot' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiParam({ name: 'hotspotId', type: Number, description: 'Hotspot ID' })
  @ApiResponse({ status: 200, description: 'Hotspot retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Hotspot not found' })
  async getHotspot(
    @Param('tourId', ParseIntPipe) virtualTourId: number,
    @Param('hotspotId', ParseIntPipe) id: number,
  ) {
    return this.virtualTourService.getHotspot(id);
  }

  @Patch(':hotspotId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a hotspot' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiParam({ name: 'hotspotId', type: Number, description: 'Hotspot ID' })
  @ApiResponse({ status: 200, description: 'Hotspot updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Hotspot not found' })
  async updateHotspot(
    @Param('hotspotId', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateHotspotDto: UpdateHotspotDto,
  ) {
    const userId = req.user.id as number;
    return this.virtualTourService.updateHotspot(id, userId, updateHotspotDto);
  }

  @Delete(':hotspotId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a hotspot' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiParam({ name: 'hotspotId', type: Number, description: 'Hotspot ID' })
  @ApiResponse({ status: 204, description: 'Hotspot deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Hotspot not found' })
  async deleteHotspot(
    @Param('hotspotId', ParseIntPipe) id: number,
    @Request() req,
  ) {
    const userId = req.user.id as number;
    return this.virtualTourService.deleteHotspot(id, userId);
  }

  @Post('reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reorder hotspots for a virtual tour' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiResponse({ status: 200, description: 'Hotspots reordered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async reorderHotspots(
    @Param('tourId', ParseIntPipe) virtualTourId: number,
    @Request() req,
    @Body() reorderDto: ReorderDto,
  ) {
    const userId = req.user.id as number;
    return this.virtualTourService.reorderHotspots(virtualTourId, userId, reorderDto.ids);
  }
}