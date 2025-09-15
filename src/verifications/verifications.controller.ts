import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VerificationsService } from './verifications.service';
import { UploadPresignDto } from './dto/upload-presign.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { ChangeDocumentStatusDto } from './dto/change-document-status.dto';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { ChangeVerificationStatusDto } from './dto/change-verification-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@ApiTags('Verifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('verifications')
export class VerificationsController {
  constructor(private readonly svc: VerificationsService) {}

  @ApiOperation({ summary: 'Presign document upload' })
  @ApiResponse({ status: 201 })
  @Post('documents/presign')
  async presign(@Body() dto: UploadPresignDto, @Req() req: RequestWithUser) {
    return this.svc.presign(dto, req.user);
  }

  @ApiOperation({ summary: 'Confirm document uploaded' })
  @ApiResponse({ status: 200 })
  @HttpCode(HttpStatus.OK)
  @Post('documents/confirm')
  async confirm(@Body() dto: ConfirmUploadDto, @Req() req: RequestWithUser) {
    return this.svc.confirmUpload(dto, req.user);
  }

  @ApiOperation({ summary: 'List documents for a user' })
  @Get('documents/:userId')
  async list(@Param('userId') userId: string, @Req() req: RequestWithUser) {
    return this.svc.listDocuments(userId, req.user);
  }

  @ApiOperation({ summary: 'Change document status (Hospital/SuperAdmin)' })
  @Roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)
  @Put('documents/:id/status')
  async docStatus(@Param('id') id: string, @Body() body: ChangeDocumentStatusDto, @Req() req: RequestWithUser) {
    return this.svc.changeDocumentStatus(id, body, req.user);
  }

  @ApiOperation({ summary: 'Request a verification (drug/background)' })
  @Post('request')
  async requestVerification(@Body() dto: CreateVerificationDto, @Req() req: RequestWithUser) {
    return this.svc.requestVerification(dto, req.user);
  }

  @ApiOperation({ summary: 'Change verification status (Hospital/SuperAdmin)' })
  @Roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)
  @Put(':id/status')
  async verStatus(@Param('id') id: string, @Body() body: ChangeVerificationStatusDto, @Req() req: RequestWithUser) {
    return this.svc.changeVerificationStatus(id, body, req.user);
  }

  @ApiOperation({ summary: 'Monthly verification stats' })
  @Get('stats')
  async stats(@Query('month') month: string) {
    return this.svc.stats(month);
  }

  @ApiOperation({ summary: 'Overdue verifications/documents' })
  @Get('overdue')
  async overdue(@Query('days') days = '14') {
    return this.svc.overdue(parseInt(days, 10) || 14);
  }
}

