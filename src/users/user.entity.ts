import { ApiProperty } from '@nestjs/swagger';
import { User as PrismaUser, Role, UserType, Organization } from '@prisma/client';
import { Exclude } from 'class-transformer'; // For excluding passwordHash

export class UserEntity implements Omit<PrismaUser, 'passwordHash'> { // Omit passwordHash from the interface
  @ApiProperty({
    description: 'User unique identifier',
    example: 'clsdlfkn10000smk1h6d99f2g',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @Exclude() // Exclude passwordHash from being exposed in API responses
  passwordHash: string; // Internal representation of the hashed password

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'User permission role',
    enum: Role,
    example: Role.STUDENT,
  })
  role: Role;

  @ApiProperty({
    description: 'User type or affiliation category',
    enum: UserType,
    example: UserType.STUDENT,
  })
  userType: UserType;

  @ApiProperty({
    description: 'Optional ID of the organization the user is affiliated with',
    example: 'clsdlfkn10001smk1h6d99f2h',
    nullable: true,
  })
  affiliationId: string | null;

  @ApiProperty({
    description: 'Whether the user\'s email has been verified',
    example: false,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: 'User account creation date',
    example: '2023-09-09T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User last update date',
    example: '2023-09-09T10:00:00.000Z',
  })
  updatedAt: Date;

  // Relations - not typically exposed directly in a UserEntity for API responses
  // but included here as per user instruction "reflect the new User model structure"
  // For actual API responses, these would be expanded or linked via other endpoints.
  @Exclude() // Typically, relations are not sent directly in a flat user response
  refreshTokens?: any[]; // Array of RefreshToken
  @Exclude()
  auditLogs?: any[]; // Array of AuditLog
  @Exclude()
  profile?: any; // Profile object
  @Exclude()
  memberships?: any[]; // Array of Membership
  @Exclude()
  affiliation?: Organization | null; // Organization object

  constructor(partial: Partial<PrismaUser>) {
    Object.assign(this, partial);
  }

  // Provide a simple mapper for controller responses
  toResponse() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      userType: this.userType,
      affiliationId: this.affiliationId ?? null,
      emailVerified: this.emailVerified,
    };
  }
}
