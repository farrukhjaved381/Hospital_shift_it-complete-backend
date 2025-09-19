import { ApiProperty } from '@nestjs/swagger';

export class MarkPaidDto {
  @ApiProperty()
  amount!: number;

  @ApiProperty({ default: 'USD' })
  currency: string = 'USD';

  @ApiProperty({ enum: ['STRIPE_CARD', 'BANK_TRANSFER', 'MANUAL'] })
  method!: 'STRIPE_CARD' | 'BANK_TRANSFER' | 'MANUAL';

  @ApiProperty({ required: false })
  notes?: string;
}
