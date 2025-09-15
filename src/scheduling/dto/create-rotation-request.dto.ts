import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, ArrayNotEmpty, IsInt, Min } from 'class-validator';

export enum DTOShiftType {
  AM = 'AM',
  PM = 'PM',
}

export class CreateRotationRequestDto {
  @ApiProperty({ description: 'School organization ID', example: 'cl_org_school_123' })
  @IsUUID()
  schoolId: string;

  @ApiProperty({ description: 'Hospital organization ID', example: 'cl_org_hospital_456' })
  @IsUUID()
  hospitalId: string;

  @ApiPropertyOptional({ description: 'Clinical site ID', example: 'cl_site_789' })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Department ID', example: 'cl_dept_123' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ description: 'Specialty', example: 'Nursing' })
  @IsString()
  specialty: string;

  @ApiProperty({ description: 'Start date (ISO)', example: '2025-10-01T08:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date (ISO)', example: '2025-12-01T16:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ enum: DTOShiftType, example: DTOShiftType.AM })
  @IsEnum(DTOShiftType)
  shift: DTOShiftType;

  @ApiProperty({ description: 'Hours per shift', example: 8 })
  @IsInt()
  @Min(1)
  hoursPerShift: number;

  @ApiProperty({ description: 'Student IDs roster', example: ['cl_user_1', 'cl_user_2'] })
  @IsArray()
  @ArrayNotEmpty()
  studentRoster: string[];
}
