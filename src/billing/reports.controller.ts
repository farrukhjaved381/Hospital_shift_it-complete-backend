import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { InvoiceStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'reports/billing', version: '1' })
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: 'Billing summary and reconciliation stats' })
  @Roles(Role.SUPER_ADMIN)
  @Get('billing')
  async billing(@Query('month') month: string) {
    const [y, m] = (month || '').split('-').map((v) => parseInt(v, 10));
    if (!y || !m) {
      const now = new Date();
      return this.summaryFor(now.getUTCFullYear(), now.getUTCMonth() + 1);
    }
    return this.summaryFor(y, m);
  }

  private async summaryFor(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const invoices = await this.prisma.invoice.findMany({ where: { createdAt: { gte: start, lt: end } } });
    const paid = invoices.filter((i) => i.status === InvoiceStatus.PAID);
    const pending = invoices.filter((i) => i.status === InvoiceStatus.PENDING_PAYMENT || i.status === InvoiceStatus.SENT);
    const failed = invoices.filter((i) => i.status === InvoiceStatus.FAILED);
    const refunded = invoices.filter((i) => i.status === InvoiceStatus.REFUNDED);
    const sum = (arr: typeof invoices, k: keyof typeof invoices[number]) => arr.reduce((s, v) => s + (Number(v[k]) || 0), 0);
    return {
      month: `${year}-${String(month).padStart(2, '0')}`,
      totals: {
        count: invoices.length,
        subtotal: sum(invoices, 'subtotal'),
        tax: sum(invoices, 'tax'),
        total: sum(invoices, 'total'),
      },
      statuses: {
        paid: { count: paid.length, total: sum(paid, 'total') },
        pending: { count: pending.length, total: sum(pending, 'total') },
        failed: { count: failed.length, total: sum(failed, 'total') },
        refunded: { count: refunded.length, total: sum(refunded, 'total') },
      },
    };
  }
}
