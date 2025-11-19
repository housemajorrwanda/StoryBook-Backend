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
import { CreateEffectDto } from './dto/create-effect.dto';
import { UpdateEffectDto } from './dto/update-effect.dto';
import { ReorderDto } from './dto/reorder.dto';


@ApiTags('Virtual Tour Effects')
@Controller('virtual-tours/:tourId/effects')
export class EffectController {
  constructor(private readonly virtualTourService: VirtualTourService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new effect for a virtual tour' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiResponse({ status: 201, description: 'Effect created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async createEffect(
    @Param('tourId', ParseIntPipe) virtualTourId: number,
    @Request() req,
    @Body() createEffectDto: CreateEffectDto,
  ) {
    const userId = req.user.id as number;
    return this.virtualTourService.createEffect(virtualTourId, userId, createEffectDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all effects for a virtual tour' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiResponse({ status: 200, description: 'Effects retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async getTourEffects(@Param('tourId', ParseIntPipe) virtualTourId: number) {
    return this.virtualTourService.getTourEffects(virtualTourId);
  }

  @Get(':effectId')
  @ApiOperation({ summary: 'Get a specific effect' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiParam({ name: 'effectId', type: Number, description: 'Effect ID' })
  @ApiResponse({ status: 200, description: 'Effect retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Effect not found' })
  async getEffect(
    @Param('tourId', ParseIntPipe) virtualTourId: number,
    @Param('effectId', ParseIntPipe) id: number,
  ) {
    return this.virtualTourService.getEffect(id);
  }

  @Patch(':effectId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an effect' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiParam({ name: 'effectId', type: Number, description: 'Effect ID' })
  @ApiResponse({ status: 200, description: 'Effect updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Effect not found' })
  async updateEffect(
    @Param('effectId', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateEffectDto: UpdateEffectDto,
  ) {
    const userId = req.user.id as number;
    return this.virtualTourService.updateEffect(id, userId, updateEffectDto);
  }

  @Delete(':effectId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an effect' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiParam({ name: 'effectId', type: Number, description: 'Effect ID' })
  @ApiResponse({ status: 204, description: 'Effect deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Effect not found' })
  async deleteEffect(
    @Param('effectId', ParseIntPipe) id: number,
    @Request() req,
  ) {
    const userId = req.user.id as number;
    return this.virtualTourService.deleteEffect(id, userId);
  }

  @Post('reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reorder effects for a virtual tour' })
  @ApiParam({ name: 'tourId', type: Number, description: 'Virtual tour ID' })
  @ApiResponse({ status: 200, description: 'Effects reordered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Virtual tour not found' })
  async reorderEffects(
    @Param('tourId', ParseIntPipe) virtualTourId: number,
    @Request() req,
    @Body() reorderDto: ReorderDto,
  ) {
    const userId = req.user.id as number;
    return this.virtualTourService.reorderEffects(virtualTourId, userId, reorderDto.ids);
  }
}