import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SchedulingService } from './scheduling.service';
import { CreateRotationRequestDto } from './dto/create-rotation-request.dto';
import { ApproveRotationRequestDto } from './dto/approve-rotation-request.dto';
import { ConflictCheckDto } from './dto/conflict-check.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { Req } from '@nestjs/common';

@ApiTags('Scheduling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @ApiOperation({ summary: 'Create rotation request (School Admin)' })
  @ApiResponse({ status: 201, description: 'Request created' })
  @Roles(Role.SCHOOL_ADMIN)
  @Post('rotation-requests')
  async createRequest(@Body() dto: CreateRotationRequestDto, @Req() req: RequestWithUser) {
    return this.schedulingService.createRotationRequest(dto, req.user);
  }

  @ApiOperation({ summary: 'Get rotation request by id' })
  @ApiResponse({ status: 200, description: 'Request details' })
  @Get('rotation-requests/:id')
  async getRequest(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.schedulingService.getRotationRequest(id, req.user);
  }

  @ApiOperation({ summary: 'List rotation requests (tenancy scoped)' })
  @ApiResponse({ status: 200 })
  @Get('rotation-requests')
  async listRequests(@Query() query: any, @Req() req: RequestWithUser) {
    return this.schedulingService.listRotationRequests(query, req.user);
  }

  @ApiOperation({ summary: 'Approve or deny rotation request (Hospital Admin or SuperAdmin)' })
  @ApiResponse({ status: 200 })
  @Roles(Role.HOSPITAL_ADMIN, Role.SUPER_ADMIN)
  @Put('rotation-requests/:id/approve')
  async approveRequest(
    @Param('id') id: string,
    @Body() dto: ApproveRotationRequestDto,
    @Req() req: RequestWithUser,
  ) {
    return this.schedulingService.approveRotationRequest(id, dto, req.user);
  }

  @ApiOperation({ summary: 'Cancel rotation request (School Admin or SuperAdmin)' })
  @ApiResponse({ status: 200 })
  @Roles(Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @Patch('rotation-requests/:id/cancel')
  async cancelRequest(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.schedulingService.cancelRotationRequest(id, req.user);
  }

  @ApiOperation({ summary: 'Get calendar events for organization' })
  @ApiResponse({ status: 200 })
  @Get('calendars/:orgId/events')
  async getCalendar(
    @Param('orgId') orgId: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Req() req: RequestWithUser,
  ) {
    return this.schedulingService.getCalendarEvents(orgId, start, end, req.user);
  }

  @ApiOperation({ summary: 'Check conflicts on a hospital calendar' })
  @ApiResponse({ status: 200 })
  @Post('calendars/conflicts')
  @HttpCode(HttpStatus.OK)
  async conflicts(@Body() dto: ConflictCheckDto) {
    return this.schedulingService.checkConflicts(dto);
  }
}

