import { ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({ enum: ['PLACEMENTS_OVERVIEW', 'COMPLIANCE_SUMMARY', 'BILLING_SUMMARY', 'UTILIZATION', 'ROTATION_DETAIL', 'VERIFICATION_DETAIL'] })
  type!: 'PLACEMENTS_OVERVIEW' | 'COMPLIANCE_SUMMARY' | 'BILLING_SUMMARY' | 'UTILIZATION' | 'ROTATION_DETAIL' | 'VERIFICATION_DETAIL';

  @ApiProperty({ type: Object })
  params!: Record<string, any>;

  @ApiProperty({ required: false, enum: ['CSV', 'PDF'] })
  format?: 'CSV' | 'PDF';
}
