import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Numéro de téléphone',
    example: '0712345678',
  })
  @IsString()
  @Matches(/^[0-9]{8,15}$/, {
    message: 'Numéro de téléphone invalide (8-15 chiffres)',
  })
  telephone: string;
}

