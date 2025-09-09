import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum } from 'class-validator';
import { Role } from '../../../generated/prisma';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@hospital.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Username',
    example: 'johndoe123',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

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

  @ApiProperty({
    description: 'User role',
    enum: Role,
    example: Role.STUDENT,
  })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
