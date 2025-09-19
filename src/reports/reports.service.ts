import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { ReportsExportService } from './exports.service';
import { Prisma, ReportStatus, ReportType } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly exporter: ReportsExportService) {}

  private assertOrgScope(user: any, orgId?: string | null) {
    if (!orgId) return;
    if (user.role === 'SUPER_ADMIN') return;
    if ((user.role === 'SCHOOL_ADMIN' || user.role === 'HOSPITAL_ADMIN') && user.affiliationId === orgId) return;
    throw new ForbiddenException();
  }

  async list(user: any) {
    const where: any = {};
    // SuperAdmin sees all; others see own generated reports
    if (user.role !== 'SUPER_ADMIN') where.generatedBy = user.id;
    return this.prisma.report.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async create(user: any, type: string, params: Record<string, any>) {
    // tenancy: if params.orgId present, enforce it
    this.assertOrgScope(user, params?.orgId);
    const result = await this.exporter.export(type, params, user?.id || null);
    const rep = await this.prisma.report.create({
      data: {
        type: type as ReportType,
        params: params as unknown as Prisma.InputJsonValue,
        status: result ? ReportStatus.READY : ReportStatus.PENDING,
        generatedBy: user.id,
        generatedAt: result ? new Date() : null,
        resultUrl: result?.url || null,
      },
    });
    await this.audit.log(user.id || null, 'REPORT_GENERATE', { reportId: rep.id, type, params });
    return rep;
  }

  async get(user: any, id: string) {
    const rep = await this.prisma.report.findUnique({ where: { id } });
    if (!rep) throw new NotFoundException('Report not found');
    if (user.role !== 'SUPER_ADMIN' && rep.generatedBy !== user.id) throw new ForbiddenException();
    return rep;
  }

  async remove(user: any, id: string) {
    const rep = await this.prisma.report.findUnique({ where: { id } });
    if (!rep) return;
    if (user.role !== 'SUPER_ADMIN' && rep.generatedBy !== user.id) throw new ForbiddenException();
    await this.prisma.report.delete({ where: { id } });
  }

  // KPI: placements (rotation requests + rotations)
  async kpiPlacements(user: any, orgId?: string, month?: string) {
    this.assertOrgScope(user, orgId);
    const [y, m] = (month || '').split('-').map((v) => parseInt(v, 10));
    const hasMonth = !!(y && m);
    const start = hasMonth ? new Date(Date.UTC(y, m - 1, 1)) : undefined;
    const end = hasMonth ? new Date(Date.UTC(y, m, 1)) : undefined;
    const reqWhere: any = {};
    if (orgId) reqWhere.OR = [{ schoolId: orgId }, { hospitalId: orgId }];
    if (hasMonth) reqWhere.createdAt = { gte: start, lt: end };
    const requests = await this.prisma.rotationRequest.findMany({ where: reqWhere, select: { status: true } });
    const rotationsWhere: any = {};
    if (orgId) rotationsWhere.OR = [{ hospitalId: orgId }];
    if (hasMonth) rotationsWhere.startDate = { gte: start, lt: end };
    const rotations = await this.prisma.rotation.findMany({ where: rotationsWhere, select: { status: true } });
    const countBy = (arr: any[], key: string, val: string) => arr.filter((r) => r[key] === val).length;
    return {
      rows: [],
      series: [],
      meta: { month: hasMonth ? month : 'all' },
      kpi: {
        requested: requests.length,
        approved: countBy(requests, 'status', 'APPROVED'),
        denied: countBy(requests, 'status', 'DENIED'),
        completed: countBy(rotations, 'status', 'COMPLETED'),
        avgLeadDays: null, // requires explicit timestamps (requested_at/approved_at)
      },
    };
  }

  // KPI: compliance (documents/verifications by affiliation)
  async kpiCompliance(user: any, orgId?: string, month?: string) {
    this.assertOrgScope(user, orgId);
    const [y, m] = (month || '').split('-').map((v) => parseInt(v, 10));
    const hasMonth = !!(y && m);
    const start = hasMonth ? new Date(Date.UTC(y, m - 1, 1)) : undefined;
    const end = hasMonth ? new Date(Date.UTC(y, m, 1)) : undefined;
    const userFilter: any = orgId ? { affiliationId: orgId } : {};
    const users = await this.prisma.user.findMany({ where: userFilter, select: { id: true } });
    const userIds = users.map((u) => u.id);
    const docWhere: any = { userId: { in: userIds } };
    const verWhere: any = { userId: { in: userIds } };
    if (hasMonth) {
      docWhere.createdAt = { gte: start, lt: end };
      verWhere.createdAt = { gte: start, lt: end };
    }
    const docs = await this.prisma.document.findMany({ where: docWhere, select: { status: true } });
    const vers = await this.prisma.verification.findMany({ where: verWhere, select: { status: true } });
    const countBy = (arr: any[], val: string) => arr.filter((r) => r.status === val).length;
    const total = users.length || 1;
    const compliantPct = null; // requires policy of which docs define compliance
    return {
      rows: [],
      series: [],
      meta: { month: hasMonth ? month : 'all' },
      kpi: {
        missing: countBy(docs, 'PENDING') + countBy(docs, 'DENIED') + countBy(docs, 'EXPIRED'),
        compliantPct,
        pendingAvgDays: null,
      },
    };
  }

  // KPI: billing summary
  async kpiBilling(user: any, orgId?: string, month?: string) {
    this.assertOrgScope(user, orgId);
    const [y, m] = (month || '').split('-').map((v) => parseInt(v, 10));
    const hasMonth = !!(y && m);
    const start = hasMonth ? new Date(Date.UTC(y, m - 1, 1)) : undefined;
    const end = hasMonth ? new Date(Date.UTC(y, m, 1)) : undefined;
    const where: any = {};
    if (orgId) where.schoolId = orgId;
    if (hasMonth) where.createdAt = { gte: start, lt: end };
    const invoices = await this.prisma.invoice.findMany({ where });
    const sum = (arr: any[], st?: string) => arr.filter((i) => (st ? i.status === st : true)).reduce((s, v) => s + (v.total || 0), 0);
    return {
      rows: [],
      series: [],
      meta: { month: hasMonth ? month : 'all' },
      kpi: {
        createdCount: invoices.length,
        paidTotal: sum(invoices, 'PAID'),
        outstandingTotal: sum(invoices, 'PENDING_PAYMENT') + sum(invoices, 'SENT'),
        avgDaysToPay: null, // requires payment timestamps versus issuedAt
      },
    };
  }

  // KPI: utilization (rotations vs assignments)
  async kpiUtilization(user: any, orgId?: string, dateFrom?: string, dateTo?: string) {
    this.assertOrgScope(user, orgId);
    const where: any = {};
    if (orgId) where.hospitalId = orgId;
    if (dateFrom && dateTo) {
      where.AND = [{ startDate: { lt: new Date(dateTo) } }, { endDate: { gt: new Date(dateFrom) } }];
    }
    const rotations = await this.prisma.rotation.findMany({ where, select: { id: true, capacity: true } });
    const rotationIds = rotations.map((r) => r.id);
    const assignments = await this.prisma.assignment.groupBy({ by: ['rotationId'], where: { rotationId: { in: rotationIds } }, _count: { _all: true } });
    const assignedMap = new Map(assignments.map((a) => [a.rotationId, a._count._all]));
    const points = rotations.map((r) => ({ rotationId: r.id, capacity: r.capacity, assigned: assignedMap.get(r.id) || 0 }));
    return {
      rows: points,
      series: [],
      meta: { dateFrom, dateTo },
    };
  }

  async listRotations(user: any, orgId?: string, start?: string, end?: string, page = 1, limit = 50) {
    this.assertOrgScope(user, orgId);
    const where: any = {};
    if (orgId) where.hospitalId = orgId;
    if (start && end) {
      where.AND = [{ startDate: { lt: new Date(end) } }, { endDate: { gt: new Date(start) } }];
    }
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.rotation.findMany({ where, orderBy: { startDate: 'desc' }, skip, take: Math.max(1, limit) }),
      this.prisma.rotation.count({ where }),
    ]);
    return { rows, meta: { page, limit, total } };
  }

  async listVerifications(user: any, orgId?: string, status?: string, start?: string, end?: string, page = 1, limit = 50) {
    this.assertOrgScope(user, orgId);
    const users = orgId ? await this.prisma.user.findMany({ where: { affiliationId: orgId }, select: { id: true } }) : [];
    const userIds = orgId ? users.map((u) => u.id) : undefined;
    const where: any = {};
    if (userIds) where.userId = { in: userIds };
    if (status) where.status = status;
    if (start && end) where.createdAt = { gte: new Date(start), lte: new Date(end) };
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.verification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Math.max(1, limit) }),
      this.prisma.verification.count({ where }),
    ]);
    return { rows, meta: { page, limit, total } };
  }

  async listInvoices(user: any, orgId?: string, status?: string, start?: string, end?: string, page = 1, limit = 50) {
    this.assertOrgScope(user, orgId);
    const where: any = {};
    if (orgId) where.schoolId = orgId;
    if (status) where.status = status;
    if (start && end) where.createdAt = { gte: new Date(start), lte: new Date(end) };
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Math.max(1, limit) }),
      this.prisma.invoice.count({ where }),
    ]);
    return { rows, meta: { page, limit, total } };
  }
}
