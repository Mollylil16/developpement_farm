import { IsEmail, IsString, MinLength, MaxLength, Matches, ValidateIf, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: "Email de l'utilisateur (optionnel si téléphone fourni)",
    example: 'user@example.com',
    required: false,
  })
  @ValidateIf((o) => !o.telephone)
  @IsEmail({}, { message: 'Email invalide' })
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Numéro de téléphone (optionnel si email fourni)',
    example: '0712345678',
    required: false,
  })
  @ValidateIf((o) => !o.email)
  @IsString()
  @Matches(/^[0-9]{8,15}$/, {
    message: 'Format de téléphone invalide (8-15 chiffres)',
  })
  @IsOptional()
  telephone?: string;

  @ApiProperty({
    description: 'Mot de passe',
    example: 'SecurePassword123!',
    minLength: 6,
    maxLength: 100,
  })
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  @MaxLength(100, { message: 'Le mot de passe ne peut pas dépasser 100 caractères' })
  password: string;
}
