import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { OrganizationType } from '@prisma/client';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Name of the organization',
    example: 'City Hospital',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Type of the organization',
    enum: OrganizationType,
    example: OrganizationType.HOSPITAL,
  })
  @IsEnum(OrganizationType)
  @IsNotEmpty()
  type: OrganizationType;
}
