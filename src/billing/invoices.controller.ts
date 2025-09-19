import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { MarkPaidDto } from './dto/mark-paid.dto';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'invoices', version: '1' })
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @ApiOperation({ summary: 'Create draft invoice' })
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @Post()
  async create(@Body() dto: CreateInvoiceDto, @Req() req: any) {
    return this.invoices.createDraft(dto, req.user?.id || null);
  }

  @ApiOperation({ summary: 'List invoices' })
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @Get()
  async list(@Query('schoolId') schoolId: string | undefined, @Query('status') status: string | undefined, @Query('start') start: string | undefined, @Query('end') end: string | undefined, @Req() req: any) {
    const user = req.user;
    if (user?.role === 'SCHOOL_ADMIN') {
      schoolId = user.affiliationId;
    }
    return this.invoices.list({ schoolId, status, start, end });
  }

  @ApiOperation({ summary: 'Invoice details' })
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @Get(':id')
  async get(@Param('id') id: string, @Req() req: any) {
    const inv = await this.invoices.get(id);
    const user = req.user;
    if (user?.role === 'SCHOOL_ADMIN' && inv.schoolId !== user.affiliationId) {
      throw new ForbiddenException();
    }
    return inv;
  }

  @ApiOperation({ summary: 'Send invoice (mark SENT and set issuedAt)' })
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @Post(':id/send')
  async send(@Param('id') id: string, @Req() req: any) {
    return this.invoices.send(id, req.user?.id || null);
  }

  @ApiOperation({ summary: 'Manually mark invoice as paid (offline payments)' })
  @Roles(Role.SUPER_ADMIN)
  @Post(':id/pay')
  async pay(@Param('id') id: string, @Body() body: MarkPaidDto, @Req() req: any) {
    return this.invoices.markPaid(id, body.amount, body.currency, body.method, req.user?.id || null);
  }

  @ApiOperation({ summary: 'Refund an invoice (stub)' })
  @Roles(Role.SUPER_ADMIN)
  @Post(':id/refund')
  async refund(@Param('id') id: string, @Req() req: any) {
    return this.invoices.refund(id, req.user?.id || null);
  }

  @ApiOperation({ summary: 'Download invoice PDF (stub)' })
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @Get(':id/pdf')
  async pdf(@Param('id') id: string) {
    // TODO: implement PDF generation + S3 presign
    return { message: 'PDF generation not implemented yet', invoiceId: id };
  }
}
