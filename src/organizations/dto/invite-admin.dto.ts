import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsEnum, IsUUID } from 'class-validator';
import { Role } from '@prisma/client';

export class InviteAdminDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@citygeneral.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Admin first name',
    example: 'Jane',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Admin last name',
    example: 'Smith',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Admin role',
    enum: Role,
    enumName: 'Role',
    example: 'HOSPITAL_ADMIN',
  })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @ApiProperty({
    description: 'Organization ID to assign the admin to',
    example: 'clxyz123abc456def789',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;
}
