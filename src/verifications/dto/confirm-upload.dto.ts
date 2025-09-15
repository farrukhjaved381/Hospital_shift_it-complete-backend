import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ConfirmUploadDto {
  @ApiProperty({ description: 'Document ID', example: 'cl_doc_cuid' })
  @IsUUID()
  documentId: string;

  @ApiPropertyOptional({ description: 'Uploaded timestamp (ISO). Defaults to now.' })
  @IsOptional()
  @IsDateString()
  uploadedAt?: string;

  @ApiPropertyOptional({ description: 'Optional file size for record', example: 12345 })
  @IsOptional()
  size?: number;
}

