import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutSessionDto {
  @ApiProperty()
  invoiceId!: string;

  @ApiProperty({ required: false })
  successUrl?: string;

  @ApiProperty({ required: false })
  cancelUrl?: string;
}

