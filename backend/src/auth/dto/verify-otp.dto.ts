import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    description: "Email ou numéro de téléphone (le même que pour la demande)",
    example: 'user@example.com',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ description: 'Code OTP à 6 chiffres', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres' })
  code: string;
}


