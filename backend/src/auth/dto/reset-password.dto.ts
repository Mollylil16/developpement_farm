import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de réinitialisation obtenu après vérification OTP',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  reset_token: string;

  @ApiProperty({
    description: 'Nouveau mot de passe',
    example: 'NewSecurePassword123!',
  })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(100, { message: 'Le mot de passe ne peut pas dépasser 100 caractères' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
    {
      message: 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre',
    }
  )
  new_password: string;
}

