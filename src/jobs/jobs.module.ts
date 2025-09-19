import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JobsService } from './jobs.service';
import { AuditService } from '../common/audit/audit.service';

@Module({
  imports: [PrismaModule],
  providers: [JobsService, AuditService],
})
export class JobsModule {}

