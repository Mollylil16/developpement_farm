import { IsString, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyResetOtpDto {
  @ApiProperty({
    description: 'Numéro de téléphone',
    example: '0712345678',
  })
  @IsString()
  @Matches(/^[0-9]{8,15}$/, {
    message: 'Numéro de téléphone invalide',
  })
  telephone: string;

  @ApiProperty({
    description: 'Code OTP à 6 chiffres',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'Le code doit contenir exactement 6 chiffres' })
  @Matches(/^[0-9]{6}$/, { message: 'Le code doit contenir uniquement des chiffres' })
  otp: string;
}

