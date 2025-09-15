import { ApiProperty } from '@nestjs/swagger';
import { Role, UserType } from '@prisma/client'; // Import Role and UserType

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'User information',
    type: Object,
  })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role; // Include Role
    userType: UserType; // Include UserType
    affiliationId: string | null; // Include affiliationId
    emailVerified: boolean; // Include emailVerified
  };
}
