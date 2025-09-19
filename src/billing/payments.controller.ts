import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { InvoiceStatus, Role } from '@prisma/client';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly prisma: PrismaService, private readonly stripe: StripeService) {}

  @ApiOperation({ summary: 'Create Stripe Checkout Session for an invoice (stub)' })
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @Post('stripe/checkout-session')
  async createCheckout(@Body() dto: CreateCheckoutSessionDto) {
    const inv = await this.prisma.invoice.findUnique({ where: { id: dto.invoiceId }, include: { items: true } });
    if (!inv) throw new Error('Invoice not found');
    const session = await this.stripe.createCheckoutSession({
      invoiceId: inv.id,
      amount: Math.round(inv.total * 100),
      currency: inv.currency.toLowerCase(),
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });
    return { sessionUrl: session.url, sessionId: session.id };
  }

  // Webhook endpoint placeholder; protect publicly with signature verification when Stripe is integrated
  @ApiOperation({ summary: 'Stripe webhook (placeholder, no signature verify here)' })
  @Post('stripe/webhook')
  async webhook(@Req() req: any) {
    // In production, verify Stripe-Signature header with STRIPE_WEBHOOK_SECRET
    const evt = req.body;
    // Simulate handling of payment_intent.succeeded
    if (evt?.type === 'payment_intent.succeeded' && evt.data?.object?.metadata?.invoiceId) {
      const invoiceId = evt.data.object.metadata.invoiceId;
      // Idempotency: avoid duplicate records for same charge id
      const existing = await this.prisma.payment.findFirst({ where: { stripeChargeId: evt.data.object.id } });
      if (!existing) {
        await this.prisma.payment.create({
          data: {
            invoiceId,
            amount: evt.data.object.amount_received / 100,
            currency: (evt.data.object.currency || 'usd').toUpperCase(),
            method: 'STRIPE_CARD',
            status: 'COMPLETED',
            receivedAt: new Date(),
            stripeChargeId: evt.data.object.id,
          },
        });
      }
      await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: InvoiceStatus.PAID, paidAt: new Date() } });
    }
    return { ok: true };
  }
}
