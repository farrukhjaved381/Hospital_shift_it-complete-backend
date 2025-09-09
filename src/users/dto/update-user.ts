import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength, IsEnum, IsBoolean } from 'class-validator';
import { Role } from '../../../generated/prisma';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'john.doe@hospital.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Username',
    example: 'johndoe123',
  })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: Role,
    example: Role.STUDENT,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({
    description: 'Whether the user is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}