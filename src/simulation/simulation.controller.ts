import { SimulationService } from './simulation.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { UpdateSimulationDto } from './dto/update-simulation.dto';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('scenario-simulations')
@Controller('scenario-simulations')
export class SimulationController {
  constructor(private readonly scenarioSimulationService: SimulationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  create(@Request() req, @Body() createDto: CreateSimulationDto) {
    return this.scenarioSimulationService.create(req.user.id, createDto);
  }

  @Get()
  @ApiQuery({ name: 'simulationType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean })
  @ApiQuery({ name: 'educationId', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() filters: any) {
    return this.scenarioSimulationService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scenarioSimulationService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateSimulationDto,
  ) {
    return this.scenarioSimulationService.update(+id, req.user.id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Request() req, @Param('id') id: string) {
    return this.scenarioSimulationService.delete(+id, req.user.id);
  }

  @Put(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  publish(@Request() req, @Param('id') id: string) {
    return this.scenarioSimulationService.publish(+id, req.user.id);
  }

  @Put(':id/unpublish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  unpublish(@Request() req, @Param('id') id: string) {
    return this.scenarioSimulationService.unpublish(+id, req.user.id);
  }

  @Get('statistics')
  @ApiQuery({ name: 'educationId', required: false, type: Number })
  getStatistics(@Query('educationId') educationId?: string) {
    return this.scenarioSimulationService.getStatistics(
      educationId ? +educationId : undefined,
    );
  }
}
