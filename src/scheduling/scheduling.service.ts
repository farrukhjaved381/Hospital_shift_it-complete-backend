import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateRotationRequestDto } from './dto/create-rotation-request.dto';
import { ApproveRotationRequestDto } from './dto/approve-rotation-request.dto';
import { ConflictCheckDto } from './dto/conflict-check.dto';
import { Role, OrganizationType } from '@prisma/client';
type RequestStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELED';
type RotationStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELED';
type CalendarEventType = 'BLOCKED' | 'ROTATION' | 'OTHER';
import { detectConflicts } from './utils/conflict.utils';

@Injectable()
export class SchedulingService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private async assertOrg(id: string, type: OrganizationType) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org || org.type !== type) throw new BadRequestException(`Organization ${id} is not a ${type}`);
    return org;
  }

  async createRotationRequest(dto: CreateRotationRequestDto, user: any) {
    if (user.role !== Role.SUPER_ADMIN) {
      if (user.role !== Role.SCHOOL_ADMIN) throw new ForbiddenException('Only school admins can create requests');
      if (!user.affiliationId || user.affiliationId !== dto.schoolId) throw new ForbiddenException('Invalid school scope');
    }

    await this.assertOrg(dto.schoolId, OrganizationType.SCHOOL);
    await this.assertOrg(dto.hospitalId, OrganizationType.HOSPITAL);

    if (dto.siteId) {
      const site = await this.prisma.clinicalSite.findUnique({ where: { id: dto.siteId } });
      if (!site || site.hospitalId !== dto.hospitalId) throw new BadRequestException('Site does not belong to hospital');
    }

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (!dept || (dto.siteId && dept.siteId !== dto.siteId)) throw new BadRequestException('Invalid department/site');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const hospitalCal = await this.getOrCreateCalendar(dto.hospitalId);
    const events = await this.prisma.calendarEvent.findMany({
      where: { calendarId: hospitalCal.id, start: { lt: end }, end: { gt: start } },
      orderBy: { start: 'asc' },
    });
    const conflicts = detectConflicts(events, start, end);
    if (conflicts.length > 0) {
      throw new BadRequestException({ message: 'Conflicts detected', conflicts });
    }

    const created = await this.prisma.rotationRequest.create({
      data: {
        schoolId: dto.schoolId,
        hospitalId: dto.hospitalId,
        siteId: dto.siteId,
        departmentId: dto.departmentId,
        specialty: dto.specialty,
        startDate: start,
        endDate: end,
        shift: dto.shift as any,
        hoursPerShift: dto.hoursPerShift,
        studentRoster: dto.studentRoster,
        status: 'PENDING',
      },
    });
    await this.audit.log(user.id || null, 'ROTATION_REQUEST_CREATED', { requestId: created.id, schoolId: created.schoolId, hospitalId: created.hospitalId });
    return created;
  }

  async getRotationRequest(id: string, user: any) {
    const req = await this.prisma.rotationRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');
    if (user.role !== Role.SUPER_ADMIN) {
      if (user.role === Role.SCHOOL_ADMIN && user.affiliationId !== req.schoolId) throw new ForbiddenException();
      if (user.role === Role.HOSPITAL_ADMIN && user.affiliationId !== req.hospitalId) throw new ForbiddenException();
    }
    return req;
  }

  async listRotationRequests(query: any, user: any) {
    const where: any = {};
    if (user.role === Role.SCHOOL_ADMIN) where.schoolId = user.affiliationId;
    if (user.role === Role.HOSPITAL_ADMIN) where.hospitalId = user.affiliationId;
    if (query.status) where.status = query.status;
    if (query.hospitalId) where.hospitalId = query.hospitalId;
    if (query.siteId) where.siteId = query.siteId;
    if (query.from && query.to) {
      where.AND = [
        { startDate: { lt: new Date(query.to) } },
        { endDate: { gt: new Date(query.from) } },
      ];
    }
    return (this.prisma as any).rotationRequest.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async approveRotationRequest(id: string, dto: ApproveRotationRequestDto, user: any) {
    const req = await (this.prisma as any).rotationRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== 'PENDING') throw new BadRequestException('Request not pending');
    if (user.role !== Role.SUPER_ADMIN) {
      if (user.role !== Role.HOSPITAL_ADMIN || user.affiliationId !== req.hospitalId) throw new ForbiddenException();
    }

    if (dto.status === 'DENIED') {
      const denied = await this.prisma.rotationRequest.update({ where: { id }, data: { status: 'DENIED' } });
      await this.audit.log(user.id || null, 'ROTATION_REQUEST_DENIED', { requestId: id });
      return denied;
    }

    const start = req.startDate;
    const end = req.endDate;
    const hospitalCal = await this.getOrCreateCalendar(req.hospitalId);
    const events = await this.prisma.calendarEvent.findMany({
      where: { calendarId: hospitalCal.id, start: { lt: end }, end: { gt: start } },
    });
    const conflicts = detectConflicts(events, start, end);
    if (conflicts.length > 0) throw new BadRequestException({ message: 'Conflicts detected', conflicts });

    const rotation = await this.prisma.rotation.create({
      data: {
        requestId: req.id,
        hospitalId: req.hospitalId,
        siteId: req.siteId || null,
        departmentId: req.departmentId || null,
        specialty: req.specialty,
        startDate: req.startDate,
        endDate: req.endDate,
        capacity: req.studentRoster.length,
        status: 'SCHEDULED',
      },
    });

    const calEvent = await this.prisma.calendarEvent.create({
      data: {
        calendarId: hospitalCal.id,
        title: `Rotation: ${req.specialty}`,
        type: 'ROTATION',
        start: req.startDate,
        end: req.endDate,
        meta: { requestId: req.id, rotationId: rotation.id },
      },
    });

    await this.prisma.rotationRequest.update({ where: { id }, data: { status: 'APPROVED' } });
    await this.audit.log(user.id || null, 'ROTATION_REQUEST_APPROVED', { requestId: id, rotationId: rotation.id, calendarEventId: calEvent.id });
    return rotation;
  }

  async cancelRotationRequest(id: string, user: any) {
    const req = await this.prisma.rotationRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');
    if (user.role !== Role.SUPER_ADMIN) {
      if (user.role !== Role.SCHOOL_ADMIN || user.affiliationId !== req.schoolId) throw new ForbiddenException();
    }
    if (!(['PENDING', 'APPROVED'] as RequestStatus[]).includes(req.status as RequestStatus)) throw new BadRequestException('Cannot cancel');
    const canceled = await this.prisma.rotationRequest.update({ where: { id }, data: { status: 'CANCELED' } });
    await this.audit.log(user.id || null, 'ROTATION_REQUEST_CANCELED', { requestId: id });
    return canceled;
  }

  async getCalendarEvents(orgId: string, start?: string, end?: string, user?: any) {
    if (user && user.role !== Role.SUPER_ADMIN && user.affiliationId !== orgId) throw new ForbiddenException();
    const cal = await this.getOrCreateCalendar(orgId);
    const where: any = { calendarId: cal.id };
    if (start && end) {
      where.start = { lt: new Date(end) };
      where.end = { gt: new Date(start) };
    }
    return this.prisma.calendarEvent.findMany({ where, orderBy: { start: 'asc' } });
  }

  async checkConflicts(dto: ConflictCheckDto) {
    const cal = await this.getOrCreateCalendar(dto.hospitalId);
    const start = new Date(dto.start);
    const end = new Date(dto.end);
    const events = await this.prisma.calendarEvent.findMany({
      where: { calendarId: cal.id, start: { lt: end }, end: { gt: start } },
      orderBy: { start: 'asc' },
    });
    return detectConflicts(events, start, end);
  }

  private async getOrCreateCalendar(orgId: string) {
    let cal = await this.prisma.calendar.findFirst({ where: { orgId } });
    if (!cal) cal = await this.prisma.calendar.create({ data: { orgId } });
    return cal;
  }
}
