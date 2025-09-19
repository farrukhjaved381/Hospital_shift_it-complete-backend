import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';

@Injectable()
export class ReportsExportService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  private toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
    const escape = (v: unknown) => {
      if (v == null) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((h) => escape(row[h])).join(','));
    }
    return lines.join('\n');
  }

  async export(type: string, params: Record<string, any>, requestedBy: string | null): Promise<{ url: string; contentType: string } | null> {
    const format = (params?.format || params?.FORMAT || 'CSV').toUpperCase();
    // Basic CSV generation for a few types; extend as needed
    if (format !== 'CSV') return null; // PDF not implemented here

    let csv = '';
    const now = new Date();
    const suffix = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    let key = `reports/${type}/${suffix}-${Date.now()}.csv`;

    if (type === 'BILLING_SUMMARY' || type === 'VERIFICATION_DETAIL' || type === 'ROTATION_DETAIL') {
      if (type === 'BILLING_SUMMARY') {
        const where: any = {};
        if (params.orgId) where.schoolId = params.orgId;
        const invoices = await this.prisma.invoice.findMany({ where, select: { id: true, schoolId: true, status: true, total: true, issuedAt: true, paidAt: true, currency: true } });
        const headers = ['id', 'schoolId', 'status', 'total', 'currency', 'issuedAt', 'paidAt'];
        csv = this.toCsv(headers, invoices);
      }
      if (type === 'VERIFICATION_DETAIL') {
        const where: any = {};
        if (params.orgId) {
          const users = await this.prisma.user.findMany({ where: { affiliationId: params.orgId }, select: { id: true } });
          where.userId = { in: users.map((u) => u.id) };
        }
        const vers = await this.prisma.verification.findMany({ where, select: { id: true, userId: true, type: true, status: true, cost: true, createdAt: true, updatedAt: true } });
        const headers = ['id', 'userId', 'type', 'status', 'cost', 'createdAt', 'updatedAt'];
        csv = this.toCsv(headers, vers);
      }
      if (type === 'ROTATION_DETAIL') {
        const where: any = {};
        if (params.orgId) where.hospitalId = params.orgId;
        const rots = await this.prisma.rotation.findMany({ where, select: { id: true, hospitalId: true, specialty: true, startDate: true, endDate: true, capacity: true, status: true } });
        const headers = ['id', 'hospitalId', 'specialty', 'startDate', 'endDate', 'capacity', 'status'];
        csv = this.toCsv(headers, rots);
      }
    } else {
      // Default: return an empty CSV with headers
      csv = this.toCsv(['column'], []);
    }

    const url = await this.storage.putObject(key, Buffer.from(csv), 'text/csv');
    return { url, contentType: 'text/csv' };
  }
}
