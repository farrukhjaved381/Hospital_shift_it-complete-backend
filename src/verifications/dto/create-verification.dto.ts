import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DTOVerificationType } from './upload-presign.dto';

export class CreateVerificationDto {
  @ApiProperty({ description: 'Target user ID', example: 'cl_user_cuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: DTOVerificationType, example: DTOVerificationType.DRUG_TEST })
  @IsEnum(DTOVerificationType)
  type: DTOVerificationType;

  @ApiPropertyOptional({ description: 'Organization ID that requested (schoolId/hospitalId)' })
  @IsOptional()
  @IsUUID()
  requestedBy?: string;

  @ApiPropertyOptional({ description: 'Arbitrary metadata payload' })
  @IsOptional()
  metadata?: Record<string, any>;
}

