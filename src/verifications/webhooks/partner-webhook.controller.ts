import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { VerificationsRepository } from '../verifications.repository';

@ApiTags('Verifications Webhooks')
@Controller('verifications/webhooks')
export class PartnerWebhookController {
  constructor(private readonly repo: VerificationsRepository) {}

  @Post('partner')
  @HttpCode(HttpStatus.OK)
  async partnerWebhook(@Body() body: any, @Headers('x-partner-signature') signature?: string) {
    const secret = process.env.PARTNER_WEBHOOK_SECRET || '';
    if (secret) {
      const payload = JSON.stringify(body);
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      if (!signature || signature !== expected) {
        return { ok: false, error: 'invalid_signature' };
      }
    }
    const { verificationId, partnerRef, status, cost, meta } = body || {};
    if (verificationId) {
      const data: any = { partnerRef, partnerMeta: meta };
      if (status) data.status = status;
      if (cost != null) data.cost = cost;
      await this.repo.updateVerification(verificationId, data);
    }
    return { ok: true };
  }
}

