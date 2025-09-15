import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Role, OrganizationType } from '@prisma/client'; // Import OrganizationType

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({
    description: 'Optional ID of the organization the user wants to affiliate with',
    example: 'clsdlfkn10001smk1h6d99f2h',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  affiliationId?: string;

  @ApiPropertyOptional({
    description: 'Optional type of the organization the user is affiliating with',
    enum: OrganizationType,
    example: OrganizationType.HOSPITAL,
    nullable: true,
  })
  @IsEnum(OrganizationType)
  @IsOptional()
  affiliationType?: OrganizationType;

  // Role is not allowed to be set during self-registration, but included for completeness in DTO
  // and for potential internal use or different registration flows.
  @ApiPropertyOptional({
    description: 'User permission role (will be ignored for self-registration and defaults to STUDENT)',
    enum: Role,
    example: Role.STUDENT,
    nullable: true,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
