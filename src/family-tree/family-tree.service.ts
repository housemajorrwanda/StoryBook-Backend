import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFamilyTreeDto,
  UpdateFamilyTreeDto,
  CreateFamilyMemberDto,
  UpdateFamilyMemberDto,
  CreateFamilyRelationDto,
} from './dto/create-family-tree.dto';

const MEMBER_SELECT = {
  id: true,
  name: true,
  photoUrl: true,
  birthDate: true,
  deathDate: true,
  bio: true,
  gender: true,
  isAlive: true,
  testimonyId: true,
  createdAt: true,
  updatedAt: true,
  testimony: {
    select: { id: true, eventTitle: true, fullName: true },
  },
};

const TREE_SELECT = {
  id: true,
  title: true,
  description: true,
  isPublic: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, fullName: true, avatar: true } },
  members: { select: MEMBER_SELECT, orderBy: { createdAt: 'asc' as const } },
  relations: {
    select: {
      id: true,
      fromMemberId: true,
      toMemberId: true,
      relationType: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class FamilyTreeService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Trees ──────────────────────────────────────────────────────────────────

  async createTree(userId: number, dto: CreateFamilyTreeDto) {
    return this.prisma.familyTree.create({
      data: { ...dto, userId },
      select: TREE_SELECT,
    });
  }

  async getMyTrees(userId: number) {
    return this.prisma.familyTree.findMany({
      where: { userId },
      select: {
        ...TREE_SELECT,
        _count: { select: { members: true, relations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublicTrees(skip = 0, limit = 20, search?: string) {
    const where = {
      isPublic: true,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              {
                description: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.familyTree.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          isPublic: true,
          createdAt: true,
          user: { select: { id: true, fullName: true, avatar: true } },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.familyTree.count({ where }),
    ]);

    return { data, meta: { total, skip, limit } };
  }

  async getTreeById(id: number, requestingUserId?: number) {
    const tree = await this.prisma.familyTree.findUnique({
      where: { id },
      select: TREE_SELECT,
    });
    if (!tree) throw new NotFoundException('Family tree not found');
    if (!tree.isPublic && tree.userId !== requestingUserId) {
      throw new ForbiddenException('This family tree is private');
    }
    return tree;
  }

  async updateTree(id: number, userId: number, dto: UpdateFamilyTreeDto) {
    await this.assertOwner(id, userId);
    return this.prisma.familyTree.update({
      where: { id },
      data: dto,
      select: TREE_SELECT,
    });
  }

  async deleteTree(id: number, userId: number) {
    await this.assertOwner(id, userId);
    await this.prisma.familyTree.delete({ where: { id } });
  }

  // ── Members ────────────────────────────────────────────────────────────────

  async addMember(
    treeId: number,
    userId: number,
    dto: CreateFamilyMemberDto,
  ) {
    await this.assertOwner(treeId, userId);
    return this.prisma.familyMember.create({
      data: { ...dto, familyTreeId: treeId },
      select: MEMBER_SELECT,
    });
  }

  async updateMember(
    treeId: number,
    memberId: number,
    userId: number,
    dto: UpdateFamilyMemberDto,
  ) {
    await this.assertOwner(treeId, userId);
    await this.assertMemberInTree(memberId, treeId);
    return this.prisma.familyMember.update({
      where: { id: memberId },
      data: dto,
      select: MEMBER_SELECT,
    });
  }

  async deleteMember(treeId: number, memberId: number, userId: number) {
    await this.assertOwner(treeId, userId);
    await this.assertMemberInTree(memberId, treeId);
    // Relations cascade-delete via DB
    await this.prisma.familyMember.delete({ where: { id: memberId } });
  }

  // ── Relations ──────────────────────────────────────────────────────────────

  async addRelation(
    treeId: number,
    userId: number,
    dto: CreateFamilyRelationDto,
  ) {
    await this.assertOwner(treeId, userId);
    await this.assertMemberInTree(dto.fromMemberId, treeId);
    await this.assertMemberInTree(dto.toMemberId, treeId);

    try {
      return await this.prisma.familyRelation.create({
        data: { ...dto, familyTreeId: treeId },
      });
    } catch {
      throw new ConflictException('This relation already exists');
    }
  }

  async deleteRelation(treeId: number, relationId: number, userId: number) {
    await this.assertOwner(treeId, userId);
    const rel = await this.prisma.familyRelation.findUnique({
      where: { id: relationId },
    });
    if (!rel || rel.familyTreeId !== treeId) {
      throw new NotFoundException('Relation not found');
    }
    await this.prisma.familyRelation.delete({ where: { id: relationId } });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async assertOwner(treeId: number, userId: number) {
    const tree = await this.prisma.familyTree.findUnique({
      where: { id: treeId },
      select: { userId: true },
    });
    if (!tree) throw new NotFoundException('Family tree not found');
    if (tree.userId !== userId)
      throw new ForbiddenException('You do not own this family tree');
  }

  private async assertMemberInTree(memberId: number, treeId: number) {
    const member = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { familyTreeId: true },
    });
    if (!member || member.familyTreeId !== treeId) {
      throw new NotFoundException(`Member ${memberId} not found in this tree`);
    }
  }
}
