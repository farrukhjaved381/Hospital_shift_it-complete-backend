import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token (composite id.token)',
    example: 'ckvToken123.abcd1234...'
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
