import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Role, UserType, OrganizationType } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'new.user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'securepassword123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'New',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'User',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({
    description: 'User permission role (defaults to STUDENT for self-registration)',
    enum: Role,
    example: Role.STUDENT,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.STUDENT;

  @ApiPropertyOptional({
    description: 'User type or affiliation category (defaults to NONE)',
    enum: UserType,
    example: UserType.NONE,
  })
  @IsEnum(UserType)
  @IsOptional()
  userType?: UserType = UserType.NONE;

  @ApiPropertyOptional({
    description: 'Optional ID of the organization the user is affiliated with',
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
  })
  @IsEnum(OrganizationType)
  @IsOptional()
  affiliationType?: OrganizationType;
}