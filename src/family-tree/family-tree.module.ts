import { Module } from '@nestjs/common';
import { FamilyTreeController } from './family-tree.controller';
import { FamilyTreeService } from './family-tree.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FamilyTreeController],
  providers: [FamilyTreeService],
  exports: [FamilyTreeService],
})
export class FamilyTreeModule {}
