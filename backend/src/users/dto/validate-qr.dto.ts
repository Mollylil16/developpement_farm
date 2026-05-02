import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateQrDto {
  @ApiProperty({
    description: 'Données du QR code (base64)',
    example: 'eyJ0eXBlIjoiY29sbGFiIiwidWlkIjoi...',
  })
  @IsString()
  @IsNotEmpty()
  qr_data: string;
}
