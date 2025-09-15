import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum DTOVerificationType {
  DOCUMENT = 'DOCUMENT',
  DRUG_TEST = 'DRUG_TEST',
  BACKGROUND_CHECK = 'BACKGROUND_CHECK',
}

export class UploadPresignDto {
  @ApiProperty({ description: 'Target user ID for the document', example: 'cl_user_cuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Original filename', example: 'mmr_certificate.pdf' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ description: 'MIME type', example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @ApiProperty({ enum: DTOVerificationType, example: DTOVerificationType.DOCUMENT })
  @IsEnum(DTOVerificationType)
  type: DTOVerificationType;

  @ApiPropertyOptional({ description: 'Optional expiry for the document' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

