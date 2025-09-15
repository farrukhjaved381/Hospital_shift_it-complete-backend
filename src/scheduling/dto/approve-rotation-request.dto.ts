import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum DTORequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  CANCELED = 'CANCELED',
}

export class ApproveRotationRequestDto {
  @ApiProperty({ enum: DTORequestStatus, example: DTORequestStatus.APPROVED })
  @IsEnum(DTORequestStatus)
  status: DTORequestStatus;

  @ApiPropertyOptional({ description: 'Optional reason for denial' })
  @IsOptional()
  @IsString()
  reason?: string;
}
