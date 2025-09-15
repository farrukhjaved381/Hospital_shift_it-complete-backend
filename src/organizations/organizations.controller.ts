import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { InviteAdminDto } from './dto/invite-admin.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, OrganizationType } from '@prisma/client';
import { Req } from '@nestjs/common';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@ApiTags('Organizations (SuperAdmin Only)')
@ApiBearerAuth('JWT-auth')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @ApiOperation({ summary: 'Create a new organization (hospital or school)' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Organization with this name already exists',
  })
  @Post()
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.create(createOrganizationDto);
  }

  @ApiOperation({ summary: 'Get all organizations' })
  @ApiResponse({
    status: 200,
    description: 'List of all organizations',
    type: [OrganizationResponseDto],
  })
  @Get()
  async getAllOrganizations(): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.findAll();
  }

  @ApiOperation({ summary: 'Get organizations by type' })
  @ApiQuery({
    name: 'type',
    enum: OrganizationType,
    description: 'Filter organizations by type',
  })
  @ApiResponse({
    status: 200,
    description: 'List of organizations filtered by type',
    type: [OrganizationResponseDto],
  })
  @Get('by-type')
  async getOrganizationsByType(
    @Query('type') type: OrganizationType,
  ): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.findByType(type);
  }

  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({
    name: 'id',
    description: 'Organization ID',
    example: 'clxyz123abc456def789',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization details',
    type: OrganizationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  @Get(':id')
  async getOrganizationById(@Param('id') id: string): Promise<OrganizationResponseDto> {
    return this.organizationsService.findOne(id);
  }

  @ApiOperation({ summary: 'Invite an admin to an organization' })
  @ApiResponse({
    status: 201,
    description: 'Admin invited successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'HOSPITAL_ADMIN invitation sent successfully' },
        tempPassword: { type: 'string', example: 'TempPass123!' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  @Post('invite-admin')
  async inviteAdmin(@Body() inviteAdminDto: InviteAdminDto, @Req() req: RequestWithUser) {
    const { organizationId, email, role } = inviteAdminDto;
    return this.organizationsService.inviteAdmin(organizationId, email, role, req.user.id);
  }

  @ApiOperation({ summary: 'Get organization members' })
  @ApiParam({
    name: 'id',
    description: 'Organization ID',
    example: 'clxyz123abc456def789',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization members list',
    schema: {
      type: 'object',
      properties: {
        organization: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['HOSPITAL', 'SCHOOL'] },
          },
        },
        members: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              membershipId: { type: 'string' },
              role: { type: 'string' },
              isActive: { type: 'boolean' },
              joinedAt: { type: 'string', format: 'date-time' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  role: { type: 'string' },
                  isActive: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
  })
  @Get(':id/members')
  async getOrganizationMembers(@Param('id') id: string) {
    return this.organizationsService.findOrganizationWithMembers(id);
  }

  @ApiOperation({ summary: 'Deactivate an organization' })
  @ApiParam({
    name: 'id',
    description: 'Organization ID',
    example: 'clxyz123abc456def789',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization deactivated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Organization City General Hospital deactivated successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async deactivateOrganization(@Param('id') id: string) {
    await this.organizationsService.remove(id);
    return { message: 'Organization deleted' };
  }
}
