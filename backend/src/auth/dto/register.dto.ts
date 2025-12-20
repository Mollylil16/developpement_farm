import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
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
    description: 'Mot de passe (optionnel pour compatibilité avec frontend)',
    example: 'SecurePassword123!',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  @MaxLength(100, { message: 'Le mot de passe ne peut pas dépasser 100 caractères' })
  password?: string;

  @ApiProperty({
    description: "Nom de l'utilisateur",
    example: 'Dupont',
  })
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  nom: string;

  @ApiProperty({
    description: "Prénom de l'utilisateur",
    example: 'Jean',
  })
  @IsString()
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  @MaxLength(100, { message: 'Le prénom ne peut pas dépasser 100 caractères' })
  prenom: string;

  @ApiProperty({
    description: 'Numéro de téléphone (optionnel si email fourni)',
    example: '0123456789',
    required: false,
  })
  @ValidateIf((o) => !o.email)
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{8,15}$/, {
    message: 'Format de téléphone invalide (8-15 chiffres)',
  })
  telephone?: string;
}
