import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VerificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createDocument(data: any) {
    return this.prisma.document.create({ data });
  }
  async updateDocument(id: string, data: any) {
    return this.prisma.document.update({ where: { id }, data });
  }
  async findDocumentsByUser(userId: string) {
    return this.prisma.document.findMany({ where: { userId }, orderBy: { uploadedAt: 'desc' } });
  }

  async createVerification(data: any) {
    return this.prisma.verification.create({ data });
  }
  async updateVerification(id: string, data: any) {
    return this.prisma.verification.update({ where: { id }, data });
  }
  async findVerificationById(id: string) {
    return this.prisma.verification.findUnique({ where: { id } });
  }
  async findVerificationsByUser(userId: string) {
    return this.prisma.verification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
  async statsByMonth(yearMonth: string) {
    const [y, m] = yearMonth.split('-').map((v) => parseInt(v, 10));
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    const counts = await this.prisma.verification.groupBy({
      by: ['status'],
      where: { createdAt: { gte: start, lt: end } },
      _count: { _all: true },
    });
    return counts;
  }
  async overdue(days: number) {
    const cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);
    const pending = await this.prisma.verification.findMany({ where: { status: 'PENDING', createdAt: { lt: cutoff } } });
    const expiredDocs = await this.prisma.document.findMany({ where: { status: 'EXPIRED' } });
    return { pendingVerifications: pending, expiredDocuments: expiredDocs };
  }
}
