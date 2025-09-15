import { ApiProperty } from '@nestjs/swagger';
import { OrganizationType } from '@prisma/client';
import { UserResponseDto } from '../../users/dto/user-response.dto'; // Ensure this import is correct

export class OrganizationResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the organization',
    example: 'clsdlfkn10000smk1h6d99f2g',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the organization',
    example: 'City Hospital',
  })
  name: string;

  @ApiProperty({
    description: 'Type of the organization',
    enum: OrganizationType,
    example: OrganizationType.HOSPITAL,
  })
  type: OrganizationType;

  @ApiProperty({
    description: 'Date and time when the organization was created',
    example: '2023-09-09T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({ type: [UserResponseDto], description: 'List of members in the organization' })
  members?: UserResponseDto[];

  constructor(partial: Partial<OrganizationResponseDto>) {
    Object.assign(this, partial);
  }
}
