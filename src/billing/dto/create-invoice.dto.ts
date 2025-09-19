import { ApiProperty } from '@nestjs/swagger';

export class CreateInvoiceItemDto {
  @ApiProperty({ enum: ['VERIFICATION', 'DRUG_TEST', 'BACKGROUND_CHECK', 'OTHER'] })
  type!: 'VERIFICATION' | 'DRUG_TEST' | 'BACKGROUND_CHECK' | 'OTHER';

  @ApiProperty()
  description!: string;

  @ApiProperty({ default: 1 })
  quantity: number = 1;

  @ApiProperty()
  unitAmount!: number;

  @ApiProperty({ required: false, type: Object })
  meta?: Record<string, any>;
}

export class CreateInvoiceDto {
  @ApiProperty()
  schoolId!: string;

  @ApiProperty({ type: [CreateInvoiceItemDto] })
  items!: CreateInvoiceItemDto[];

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  dueDate?: string;

  @ApiProperty({ required: false, default: 'USD' })
  currency?: string = 'USD';
}
