import { Module } from '@nestjs/common';
import { VerificationsController } from './verifications.controller';
import { VerificationsService } from './verifications.service';
import { VerificationsRepository } from './verifications.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VerificationsController],
  providers: [VerificationsService, VerificationsRepository],
})
export class VerificationsModule {}

