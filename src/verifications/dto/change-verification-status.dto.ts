import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';

export enum DTOStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  EXPIRED = 'EXPIRED',
}

export class ChangeVerificationStatusDto {
  @ApiProperty({ enum: DTOStatus })
  @IsEnum(DTOStatus)
  status: DTOStatus;

  @ApiPropertyOptional({ description: 'Cost to be billed on approval', example: 55.0 })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiPropertyOptional({ description: 'Optional notes' })
  @IsOptional()
  notes?: string;
}

