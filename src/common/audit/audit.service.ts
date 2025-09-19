import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(actorId: string | null, action: string, meta?: unknown) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: actorId || undefined as unknown as string, // allow null-ish silently
          action,
          meta: meta as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      // Swallow audit errors to avoid impacting main flow
    }
  }
}
