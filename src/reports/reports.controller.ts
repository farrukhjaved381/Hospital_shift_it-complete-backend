import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { AuditService } from '../common/audit/audit.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reports: ReportsService, private readonly audit: AuditService) {}

  @ApiOperation({ summary: 'List generated reports' })
  @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.SCHOOL_ADMIN)
  @Get()
  async list(@Req() req: any) {
    return this.reports.list(req.user);
  }

  @ApiOperation({ summary: 'Request report generation (synchronous stub)' })
  @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.SCHOOL_ADMIN)
  @Post()
  async create(@Body() dto: CreateReportDto, @Req() req: any) {
    return this.reports.create(req.user, dto.type, dto.params);
  }

  // Alias: export endpoint per spec
  @ApiOperation({ summary: 'Request an export (alias to create)' })
  @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.SCHOOL_ADMIN)
  @Post('export')
  async export(@Body() dto: CreateReportDto, @Req() req: any) {
    return this.reports.create(req.user, dto.type, dto.params);
  }

  @ApiOperation({ summary: 'Get report status/details' })
  @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.SCHOOL_ADMIN)
  @Get(':id')
  async get(@Param('id') id: string, @Req() req: any) {
    return this.reports.get(req.user, id);
  }

  @ApiOperation({ summary: 'Download report (returns result URL)' })
  @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.SCHOOL_ADMIN)
  @Get('download/:id')
  async download(@Param('id') id: string, @Req() req: any) {
    const rep = await this.reports.get(req.user, id);
    await this.audit.log(req.user?.id || null, 'REPORT_DOWNLOAD', { reportId: id });
    return { url: rep.resultUrl, status: rep.status };
  }

  @ApiOperation({ summary: 'Delete report artifact' })
  @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.SCHOOL_ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.reports.remove(req.user, id);
    return { ok: true };
  }

  // KPI endpoints
  @ApiOperation({ summary: 'KPI: placements' })
  @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.SCHOOL_ADMIN)
  @Get('kpi/placements')
  async kpiPlacements(@Query('orgId') orgId: string | undefined, @Query('month') month: string | undefined, @Req() req: any) {
    return this.reports.kpiPlacements(req.user, orgId, month);
  }

  @ApiOperation({ summary: 'KPI: compliance' })
  @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.SCHOOL_ADMIN)
  @Get('kpi/compliance')
  async kpiCompliance(@Query('orgId') orgId: string | undefined, @Query('month') month: string | undefined, @Req() req: any) {
    return this.reports.kpiCompliance(req.user, orgId, month);
  }

  @ApiOperation({ summary: 'KPI: billing' })
  @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.SCHOOL_ADMIN)
  @Get('kpi/billing')
  async kpiBilling(@Query('orgId') orgId: string | undefined, @Query('month') month: string | undefined, @Req() req: any) {
    return this.reports.kpiBilling(req.user, orgId, month);
  }

  @ApiOperation({ summary: 'KPI: utilization' })
  @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN)
  @Get('kpi/utilization')
  async kpiUtilization(
    @Query('orgId') orgId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Req() req: any,
  ) {
    return this.reports.kpiUtilization(req.user, orgId, dateFrom, dateTo);
  }

  // Detail drilldowns
  @ApiOperation({ summary: 'Rotations drilldown' })
  @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN)
  @Get('rotations')
  async rotations(
    @Query('orgId') orgId: string | undefined,
    @Query('start') start: string | undefined,
    @Query('end') end: string | undefined,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Req() req: any,
  ) {
    return this.reports.listRotations(req.user, orgId, start, end, parseInt(page, 10) || 1, parseInt(limit, 10) || 50);
  }

  @ApiOperation({ summary: 'Verifications drilldown' })
  @Roles(Role.SUPER_ADMIN, Role.HOSPITAL_ADMIN, Role.SCHOOL_ADMIN)
  @Get('verifications')
  async verifications(
    @Query('orgId') orgId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('start') start: string | undefined,
    @Query('end') end: string | undefined,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Req() req: any,
  ) {
    return this.reports.listVerifications(req.user, orgId, status, start, end, parseInt(page, 10) || 1, parseInt(limit, 10) || 50);
  }

  @ApiOperation({ summary: 'Invoices drilldown' })
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @Get('invoices')
  async invoices(
    @Query('orgId') orgId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('start') start: string | undefined,
    @Query('end') end: string | undefined,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Req() req: any,
  ) {
    // SCHOOL_ADMIN forced to their own org
    if (req.user?.role === 'SCHOOL_ADMIN') orgId = req.user.affiliationId;
    return this.reports.listInvoices(req.user, orgId, status, start, end, parseInt(page, 10) || 1, parseInt(limit, 10) || 50);
  }
}
