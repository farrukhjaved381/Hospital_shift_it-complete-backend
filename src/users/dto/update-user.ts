import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, IsEmail, IsEnum, IsUUID } from 'class-validator';
import { Role, UserType, OrganizationType } from '@prisma/client'; // Import OrganizationType

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Optional updated email address',
    example: 'jane.doe@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Optional updated password (min 8 characters)',
    example: 'newpassword123',
    minLength: 8,
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    description: 'Optional updated first name',
    example: 'Jane',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Optional updated last name',
    example: 'Doe',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Optional updated role',
    enum: Role,
    example: Role.STUDENT,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({
    description: 'Optional updated user type',
    enum: UserType,
    example: UserType.HOSPITAL_USER,
  })
  @IsEnum(UserType)
  @IsOptional()
  userType?: UserType;

  @ApiPropertyOptional({
    description: 'Optional updated affiliation ID',
    example: 'clsdlfkn10001smk1h6d99f2h',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  affiliationId?: string | null;

  @ApiPropertyOptional({
    description: 'Optional updated affiliation type (required if affiliationId is provided)',
    enum: OrganizationType,
    example: OrganizationType.HOSPITAL,
    nullable: true,
  })
  @IsEnum(OrganizationType)
  @IsOptional()
  affiliationType?: OrganizationType; // Added missing property

  @ApiPropertyOptional({
    description: 'Optional status for email verification',
    example: true,
  })
  @IsOptional()
  emailVerified?: boolean;
}