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
import { CreateAudioRegionDto } from './dto/create-audio-region.dto';
import { UpdateAudioRegionDto } from './dto/update-audio-region.dto';
import { ReorderDto } from './dto/reorder.dto';

@ApiTags('Virtual Tour Audio Regions')
@Controller('virtual-tours/:tourId/audio-regions')
export class AudioRegionController {
  constructor(private readonly virtualTourService: VirtualTourService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new audio region for a virtual tour' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiResponse({
    status: 201,
    description: 'Audio region created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async createAudioRegion(
    @Param('tourId', ParseIntPipe) virtualTourId: number,
    @Request() req,
    @Body() createAudioRegionDto: CreateAudioRegionDto,
  ) {
    const userId = req.user.id as number;
    return this.virtualTourService.createAudioRegion(
      virtualTourId,
      userId,
      createAudioRegionDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all audio regions for a virtual tour' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiResponse({
    status: 200,
    description: 'Audio regions retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async getTourAudioRegions(
    @Param('tourId', ParseIntPipe) virtualTourId: number,
  ) {
    return this.virtualTourService.getTourAudioRegions(virtualTourId);
  }

  @Get(':audioRegionId')
  @ApiOperation({ summary: 'Get a specific audio region' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiParam({
    name: 'audioRegionId',
    type: Number,
    description: 'Audio region ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Audio region retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Audio region not found' })
  async getAudioRegion(
    @Param('tourId', ParseIntPipe) virtualTourId: number,
    @Param('audioRegionId', ParseIntPipe) id: number,
  ) {
    return this.virtualTourService.getAudioRegion(id);
  }

  @Patch(':audioRegionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an audio region' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiParam({
    name: 'audioRegionId',
    type: Number,
    description: 'Audio region ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Audio region updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Audio region not found' })
  async updateAudioRegion(
    @Param('audioRegionId', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateAudioRegionDto: UpdateAudioRegionDto,
  ) {
    const userId = req.user.id as number;
    return this.virtualTourService.updateAudioRegion(
      id,
      userId,
      updateAudioRegionDto,
    );
  }

  @Delete(':audioRegionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an audio region' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiParam({
    name: 'audioRegionId',
    type: Number,
    description: 'Audio region ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Audio region deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Audio region not found' })
  async deleteAudioRegion(
    @Param('audioRegionId', ParseIntPipe) id: number,
    @Request() req,
  ) {
    const userId = req.user.id as number;
    return this.virtualTourService.deleteAudioRegion(id, userId);
  }

  @Post('reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reorder audio regions for a virtual tour' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiResponse({
    status: 200,
    description: 'Audio regions reordered successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async reorderAudioRegions(
    @Param('tourId', ParseIntPipe) virtualTourId: number,
    @Request() req,
    @Body() reorderDto: ReorderDto,
  ) {
    const userId = req.user.id as number;
    return this.virtualTourService.reorderAudioRegions(
      virtualTourId,
      userId,
      reorderDto.ids,
    );
  }
}
