import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FamilyTreeService } from './family-tree.service';
import {
  CreateFamilyTreeDto,
  UpdateFamilyTreeDto,
  CreateFamilyMemberDto,
  UpdateFamilyMemberDto,
  CreateFamilyRelationDto,
} from './dto/create-family-tree.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Family Trees')
@Controller('family-trees')
export class FamilyTreeController {
  constructor(private readonly familyTreeService: FamilyTreeService) {}

  // ── Public ─────────────────────────────────────────────────────────────────

  @Get('public')
  @ApiOperation({ summary: 'Get all public family trees' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  getPublic(
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.familyTreeService.getPublicTrees(
      skip ? parseInt(skip) : 0,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Get('public/:id')
  @ApiOperation({ summary: 'Get a public family tree by ID' })
  @ApiParam({ name: 'id', type: Number })
  getPublicById(@Param('id', ParseIntPipe) id: number) {
    return this.familyTreeService.getTreeById(id);
  }

  // ── Authenticated ──────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new family tree' })
  create(@Request() req, @Body() dto: CreateFamilyTreeDto) {
    return this.familyTreeService.createTree(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('my')
  @ApiOperation({ summary: "Get current user's family trees" })
  getMy(@Request() req) {
    return this.familyTreeService.getMyTrees(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get a family tree by ID (owner or public)' })
  @ApiParam({ name: 'id', type: Number })
  getById(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.familyTreeService.getTreeById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update a family tree' })
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFamilyTreeDto,
  ) {
    return this.familyTreeService.updateTree(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a family tree' })
  delete(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.familyTreeService.deleteTree(id, req.user.id);
  }

  // ── Members ────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to a family tree' })
  addMember(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateFamilyMemberDto,
  ) {
    return this.familyTreeService.addMember(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Update a family member' })
  updateMember(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() dto: UpdateFamilyMemberDto,
  ) {
    return this.familyTreeService.updateMember(id, memberId, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from a family tree' })
  deleteMember(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId', ParseIntPipe) memberId: number,
  ) {
    return this.familyTreeService.deleteMember(id, memberId, req.user.id);
  }

  // ── Relations ──────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/relations')
  @ApiOperation({ summary: 'Add a relation between two members' })
  addRelation(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateFamilyRelationDto,
  ) {
    return this.familyTreeService.addRelation(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id/relations/:relationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a relation' })
  deleteRelation(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('relationId', ParseIntPipe) relationId: number,
  ) {
    return this.familyTreeService.deleteRelation(id, relationId, req.user.id);
  }
}
