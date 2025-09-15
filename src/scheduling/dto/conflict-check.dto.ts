import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class ConflictCheckDto {
  @ApiProperty({ description: 'Hospital organization ID owning the calendar', example: 'cl_org_hospital_456' })
  @IsUUID()
  hospitalId: string;

  @ApiProperty({ description: 'Start (ISO)', example: '2025-10-01T08:00:00.000Z' })
  @IsDateString()
  start: string;

  @ApiProperty({ description: 'End (ISO)', example: '2025-12-01T16:00:00.000Z' })
  @IsDateString()
  end: string;
}

