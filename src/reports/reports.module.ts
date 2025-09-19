import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from '../common/audit/audit.service';
import { ReportsExportService } from './exports.service';
import { StorageService } from '../common/storage/storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsExportService, StorageService, AuditService],
})
export class ReportsModule {}
