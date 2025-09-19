import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { InvoiceStatus, Status } from '@prisma/client';

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private intervals: NodeJS.Timeout[] = [];

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  onModuleInit() {
    // Nightly aggregates (01:05 UTC)
    const nightlyMs = 24 * 3600 * 1000;
    const scheduleNightly = () => {
      this.runNightlyAggregates().catch((e) => this.logger.warn(`Nightly aggregates failed: ${e?.message}`));
      this.intervals.push(setInterval(() => this.runNightlyAggregates().catch(() => {}), nightlyMs));
    };
    setTimeout(scheduleNightly, 10_000);

    // Hourly overdue invoice reminders
    this.intervals.push(setInterval(() => this.remindOverdueInvoices().catch(() => {}), 3600 * 1000));
    // Hourly document expiry check
    this.intervals.push(setInterval(() => this.expireDocuments().catch(() => {}), 3600 * 1000));
    // Daily pending verifications reminder
    this.intervals.push(setInterval(() => this.remindPendingVerifications().catch(() => {}), 24 * 3600 * 1000));
  }

  onModuleDestroy() {
    for (const t of this.intervals) clearInterval(t);
  }

  private async runNightlyAggregates() {
    // Placeholder: if materialized views exist, refresh them; else compute nothing
    this.logger.log('Running nightly aggregates (placeholder)');
    // Example: await this.prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_placements_monthly');
  }

  private async remindOverdueInvoices() {
    const now = new Date();
    const overdue = await this.prisma.invoice.findMany({ where: { status: { in: [InvoiceStatus.SENT, InvoiceStatus.PENDING_PAYMENT] }, dueDate: { lt: now } } });
    for (const inv of overdue) {
      await this.audit.log(null, 'INVOICE_OVERDUE_ALERT', { invoiceId: inv.id, schoolId: inv.schoolId, dueDate: inv.dueDate });
    }
  }

  private async expireDocuments() {
    const now = new Date();
    const updated = await this.prisma.document.updateMany({ where: { expiresAt: { lt: now }, status: { not: Status.EXPIRED } }, data: { status: Status.EXPIRED } });
    if (updated.count > 0) {
      await this.audit.log(null, 'DOCUMENTS_EXPIRED_BATCH', { count: updated.count });
    }
  }

  private async remindPendingVerifications() {
    const days = parseInt(process.env.OVERDUE_VERIFICATION_DAYS || '14', 10);
    const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);
    const pending = await this.prisma.verification.findMany({ where: { status: Status.PENDING, createdAt: { lt: cutoff } }, select: { id: true, userId: true } });
    for (const v of pending) {
      await this.audit.log(v.userId, 'VERIFICATION_PENDING_REMINDER', { verificationId: v.id, days });
    }
  }
}
