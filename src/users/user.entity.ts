import { ApiProperty } from '@nestjs/swagger';
import { User as PrismaUser, Role } from '../../generated/prisma';

export class UserEntity implements PrismaUser {
  @ApiProperty({
    description: 'User unique identifier',
    example: 'clk1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@hospital.com',
  })
  email: string;

  @ApiProperty({
    description: 'Username',
    example: 'johndoe123',
  })
  username: string;

  // Don't expose password in API responses
  password: string;

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
    description: 'User role',
    enum: Role,
    example: Role.STUDENT,
  })
  role: Role;

  @ApiProperty({
    description: 'Whether the user is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'User creation date',
    example: '2023-09-09T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User last update date',
    example: '2023-09-09T10:00:00Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  // Method to exclude password from responses
  toResponse(): Omit<UserEntity, 'password' | 'toResponse'> {
    const { password, toResponse, ...result } = this;
    return result;
  }
}