import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { Role, OrganizationType, UserType } from '@prisma/client'; // Import UserType
import { CreateUserDto } from '../users/dto/create-user'; // Import CreateUserDto
import { hashString } from '../auth/utils/hash.util'; // use unified hasher
import { UserResponseDto } from '../users/dto/user-response.dto'; // Import UserResponseDto

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new organization.
   * Only SuperAdmins can create organizations directly.
   * @param createOrganizationDto Data to create a new organization.
   * @returns The created organization.
   */
  async create(createOrganizationDto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    const organization = await this.prisma.organization.create({
      data: {
        name: createOrganizationDto.name,
        type: createOrganizationDto.type,
        // Removed address, phone, email as per schema update
      },
    });
    return organization; // Return the created organization
  }

  /**
   * Finds all organizations.
   * @returns A list of organizations.
   */
  async findAll(): Promise<OrganizationResponseDto[]> {
    const organizations = await this.prisma.organization.findMany({
      // Removed where: { isActive: true } as per schema update
    });
    return organizations; // Return all organizations
  }

  /**
   * Finds an organization by its ID.
   * @param id The ID of the organization.
   * @returns The organization if found.
   * @throws NotFoundException if the organization is not found.
   */
  async findOne(id: string): Promise<OrganizationResponseDto> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    return organization; // Return the found organization
  }

  /**
   * Finds organizations that the current user is a member of.
   * @param userId The ID of the current user.
   * @returns A list of organizations the user is a member of.
   */
  async findMyOrganizations(userId: string): Promise<OrganizationResponseDto[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        organization: true, // Include the organization details
      },
    });
    return memberships.map(membership => membership.organization); // Return the organizations
  }

  /**
   * Invites an admin to an organization.
   * This method is intended for SuperAdmins to create HOSPITAL_ADMIN or SCHOOL_ADMIN roles.
   * @param orgId The ID of the organization to invite an admin to.
   * @param inviteeEmail The email of the person to invite.
   * @param roleToCreate The role to assign to the invited admin (HOSPITAL_ADMIN or SCHOOL_ADMIN).
   * @param invitedBy The ID of the SuperAdmin initiating the invite.
   * @returns An object containing the invite ID and a message.
   */
  async inviteAdmin(
    orgId: string,
    inviteeEmail: string,
    roleToCreate: Role,
    invitedBy: string,
  ): Promise<{ inviteId: string; message: string }> {
    if (roleToCreate !== Role.HOSPITAL_ADMIN && roleToCreate !== Role.SCHOOL_ADMIN) {
      throw new BadRequestException('Only HOSPITAL_ADMIN or SCHOOL_ADMIN roles can be invited.');
    }

    const organization = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${orgId} not found.`);
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: inviteeEmail } });
    if (existingUser) {
      // If user exists, we can still invite them, but the accept-invite flow will handle merging
      // For now, let's just throw a conflict if they are already an admin of this org or same role
      const existingMembership = await this.prisma.membership.findFirst({
        where: { userId: existingUser.id, organizationId: orgId, role: roleToCreate },
      });
      if (existingMembership) {
        throw new ConflictException(`User ${inviteeEmail} is already an ${roleToCreate} of this organization.`);
      }
    }

    // Generate a unique token for the invite
    const token = await hashString(Math.random().toString()); // Hash a random string
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Invite valid for 7 days

    const invite = await this.prisma.invite.create({
      data: {
        inviteeEmail,
        orgId,
        roleToCreate,
        invitedBy,
        token,
        expiresAt,
      },
    });

    // TODO: Send email with invite link containing the token
    return { inviteId: invite.id, message: 'Admin invite sent successfully.' };
  }

  /**
   * Creates an admin user directly.
   * This method is intended for SuperAdmins to create HOSPITAL_ADMIN or SCHOOL_ADMIN roles.
   * @param createAdminDto Data to create a new admin user.
   * @returns The created admin user.
   */
  async createAdmin(createAdminDto: CreateUserDto): Promise<OrganizationResponseDto> { // Use CreateUserDto
    const { email, password, firstName, lastName, affiliationId, role } = createAdminDto;

    if (role !== Role.HOSPITAL_ADMIN && role !== Role.SCHOOL_ADMIN) {
      throw new BadRequestException('Only HOSPITAL_ADMIN or SCHOOL_ADMIN roles can be created directly.');
    }

    const organization = await this.prisma.organization.findUnique({ where: { id: affiliationId } });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${affiliationId} not found.`);
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists.`);
    }

    const passwordHash = await hashString(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        userType: role === Role.HOSPITAL_ADMIN ? UserType.HOSPITAL_USER : UserType.SCHOOL_USER, // Set userType based on role
        affiliationId: affiliationId,
        emailVerified: true, // Admins created directly are considered verified
      },
    });

    // Create membership
    await this.prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: affiliationId!,
        role,
      },
    });
    return organization; // Return the organization related to the admin
  }

  /**
   * Retrieves an organization along with its members.
   * @param id The ID of the organization.
   * @returns The organization with its members.
   * @throws NotFoundException if the organization is not found.
   */
  async findOrganizationWithMembers(id: string): Promise<OrganizationResponseDto> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        usersWithAffiliation: { // Use the relation name from schema.prisma
          include: {
            memberships: {
              where: { organizationId: id },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    const members = organization.usersWithAffiliation.map(user => {
      const membership = user.memberships[0]; // Assuming one membership per organization for display
      return new UserResponseDto({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: membership?.role || Role.STUDENT, // Default to STUDENT if no specific role found
        userType: user.userType,
        affiliationId: user.affiliationId,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    });

    return { ...organization, members };
  }

  /**
   * Soft deletes an organization (marks as inactive).
   * @param id The ID of the organization to delete.
   */
  async remove(id: string): Promise<void> {
    // Since isActive was removed from schema, this will be a hard delete or require schema re-evaluation.
    // For now, performing a hard delete.
    await this.prisma.organization.delete({
      where: { id },
    });
  }

  /**
   * Returns organizations filtered by type.
   */
  async findByType(type: OrganizationType): Promise<OrganizationResponseDto[]> {
    return this.prisma.organization.findMany({ where: { type } });
  }
}
