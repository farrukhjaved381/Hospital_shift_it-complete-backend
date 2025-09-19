import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.service';
import { AuditService } from '../common/audit/audit.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [PrismaModule],
  controllers: [InvoicesController, PaymentsController, ReportsController],
  providers: [InvoicesService, StripeService, AuditService],
  exports: [InvoicesService],
})
export class BillingModule {}
