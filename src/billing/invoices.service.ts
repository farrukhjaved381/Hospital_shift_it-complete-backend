import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { AuditService } from '../common/audit/audit.service';
import { generateInvoiceNumber } from './utils/invoice-number.util';
import { InvoiceStatus, ItemType, PaymentStatus, Prisma } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async createDraft(dto: CreateInvoiceDto, actorId: string | null) {
    if (!dto.items?.length) throw new BadRequestException('Invoice must have at least one item');
    const currency = dto.currency || 'USD';

    const subtotal = dto.items.reduce((s, i) => s + i.unitAmount * (i.quantity || 1), 0);
    const taxPercent = parseFloat(process.env.INVOICE_TAX_PERCENT || '0');
    const tax = +(subtotal * taxPercent).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    const invoice = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          schoolId: dto.schoolId,
          status: InvoiceStatus.DRAFT,
          currency,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          notes: dto.notes,
          subtotal,
          tax,
          total,
        },
      });
      for (const it of dto.items) {
        const qty = it.quantity || 1;
        await tx.invoiceItem.create({
          data: {
            invoiceId: inv.id,
            type: it.type as unknown as ItemType,
            description: it.description,
            quantity: qty,
            unitAmount: it.unitAmount,
            total: +(it.unitAmount * qty).toFixed(2),
            meta: (it.meta as unknown as Prisma.InputJsonValue) || undefined,
          },
        });
      }
      return inv;
    });
    await this.audit.log(actorId, 'INVOICE_CREATED', { invoiceId: invoice.id, schoolId: invoice.schoolId });
    return invoice;
  }

  async list(params: { schoolId?: string; status?: string; start?: string; end?: string }) {
    const where: Prisma.InvoiceWhereInput = {};
    if (params.schoolId) where.schoolId = params.schoolId;
    if (params.status) where.status = params.status as unknown as InvoiceStatus;
    if (params.start || params.end) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (params.start) dateFilter.gte = new Date(params.start);
      if (params.end) dateFilter.lte = new Date(params.end);
      where.createdAt = dateFilter;
    }
    return this.prisma.invoice.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async get(id: string) {
    const inv = await this.prisma.invoice.findUnique({ where: { id }, include: { items: true, payments: true, school: true } });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async send(id: string, actorId: string | null) {
    const inv = await this.prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status !== InvoiceStatus.DRAFT && inv.status !== InvoiceStatus.SENT) throw new BadRequestException('Only DRAFT can be sent');

    const prefix = process.env.INVOICE_NUMBER_PREFIX || 'INV';
    const dueDays = parseInt(process.env.INVOICE_DUE_DAYS || '14', 10);
    const nextNumber = inv.invoiceNumber || generateInvoiceNumber(prefix);

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        invoiceNumber: nextNumber,
        status: InvoiceStatus.SENT,
        issuedAt: new Date(),
        dueDate: inv.dueDate || new Date(Date.now() + dueDays * 24 * 3600 * 1000),
      },
    });
    await this.audit.log(actorId, 'INVOICE_SENT', { invoiceId: id, invoiceNumber: nextNumber });
    return updated;
  }

  async markPaid(id: string, amount: number, currency: string, method: 'STRIPE_CARD' | 'BANK_TRANSFER' | 'MANUAL', actorId: string | null) {
    const inv = await this.prisma.invoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status === InvoiceStatus.PAID) return inv;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          invoiceId: inv.id,
          amount,
          currency: currency || inv.currency,
          method,
          status: PaymentStatus.COMPLETED,
          receivedAt: new Date(),
        },
      });
      const agg = await tx.payment.aggregate({ _sum: { amount: true }, where: { invoiceId: inv.id, status: PaymentStatus.COMPLETED } });
      const paid = +(agg?._sum?.amount || 0);
      const fullyPaid = paid >= inv.total;
      return tx.invoice.update({ where: { id: inv.id }, data: { status: fullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PENDING_PAYMENT, paidAt: fullyPaid ? new Date() : null } });
    });
    await this.audit.log(actorId, 'INVOICE_PAID', { invoiceId: id, amount, method });
    return updated;
  }

  async refund(id: string, actorId: string | null) {
    const inv = await this.prisma.invoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Invoice not found');
    const updated = await this.prisma.invoice.update({ where: { id }, data: { status: InvoiceStatus.REFUNDED } });
    await this.audit.log(actorId, 'PAYMENT_REFUNDED', { invoiceId: id });
    return updated;
  }

  async attachItemForVerification(params: {
    schoolId: string;
    description: string;
    amount: number;
    type: ItemType;
    meta?: Record<string, unknown>;
  }) {
    // Simple strategy: create one invoice per verification (DRAFT)
    const subtotal = params.amount;
    const taxPercent = parseFloat(process.env.INVOICE_TAX_PERCENT || '0');
    const tax = +(subtotal * taxPercent).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    const inv = await this.prisma.invoice.create({
      data: {
        schoolId: params.schoolId,
        status: InvoiceStatus.DRAFT,
        currency: 'USD',
        subtotal,
        tax,
        total,
        items: {
          create: {
            type: params.type,
            description: params.description,
            quantity: 1,
            unitAmount: params.amount,
            total: params.amount,
            meta: (params.meta as unknown as Prisma.InputJsonValue) || undefined,
          },
        },
      },
    });
    return inv;
  }
}
