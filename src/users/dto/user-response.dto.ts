import { ApiProperty } from '@nestjs/swagger';
import { Role, UserType } from '@prisma/client';
import { UserEntity } from '../user.entity'; // Import UserEntity

export class UserResponseDto {
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

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
