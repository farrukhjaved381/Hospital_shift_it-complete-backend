import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { VerificationType } from '@prisma/client';

export class CreateVerificationDto {
  @ApiProperty({ description: 'Target user ID', example: 'cl_user_cuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: VerificationType, example: VerificationType.DRUG_TEST })
  @IsEnum(VerificationType)
  type: VerificationType;

  @ApiPropertyOptional({ description: 'Organization ID that requested (schoolId/hospitalId)' })
  @IsOptional()
  @IsUUID()
  requestedBy?: string;

  @ApiPropertyOptional({ description: 'Arbitrary metadata payload' })
  @IsOptional()
  metadata?: Record<string, any>;
}
