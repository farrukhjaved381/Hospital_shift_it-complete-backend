import { Module } from '@nestjs/common';
import { VerificationsController } from './verifications.controller';
import { VerificationsService } from './verifications.service';
import { VerificationsRepository } from './verifications.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Service } from './storage/s3.service';
import { PartnerWebhookController } from './webhooks/partner-webhook.controller';

@Module({
  imports: [PrismaModule],
  controllers: [VerificationsController, PartnerWebhookController],
  providers: [VerificationsService, VerificationsRepository, S3Service],
})
export class VerificationsModule {}
