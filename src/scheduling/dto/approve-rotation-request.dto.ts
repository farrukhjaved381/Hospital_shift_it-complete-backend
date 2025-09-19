import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class ApproveRotationRequestDto {
  @ApiProperty({ enum: RequestStatus, example: RequestStatus.APPROVED })
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @ApiPropertyOptional({ description: 'Optional reason for denial' })
  @IsOptional()
  @IsString()
  reason?: string;
}
