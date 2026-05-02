import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsBoolean, IsArray, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePromotionDto {
  @ApiProperty({ description: 'Code de la promotion (unique)' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Nom de la promotion' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Description de la promotion', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Type de promotion',
    enum: ['discount', 'free_month', 'gift', 'bonus']
  })
  @IsEnum(['discount', 'free_month', 'gift', 'bonus'])
  type: 'discount' | 'free_month' | 'gift' | 'bonus';

  @ApiProperty({ description: 'Pourcentage de réduction (si type = discount)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount_percentage?: number;

  @ApiProperty({ description: 'Montant fixe de réduction en CFA (si type = discount)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_amount?: number;

  @ApiProperty({ description: 'Nombre de mois gratuits (si type = free_month)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  free_months?: number;

  @ApiProperty({ description: 'Description du cadeau (si type = gift)', required: false })
  @IsOptional()
  @IsString()
  gift_description?: string;

  @ApiProperty({ description: 'Date de début de validité' })
  @IsDateString()
  valid_from: string;

  @ApiProperty({ description: 'Date de fin de validité', required: false })
  @IsOptional()
  @IsDateString()
  valid_until?: string;

  @ApiProperty({ description: 'Nombre maximum d\'utilisations (null = illimité)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  max_uses?: number;

  @ApiProperty({ 
    description: 'Audience cible',
    enum: ['all', 'new_users', 'active_users', 'specific_users']
  })
  @IsEnum(['all', 'new_users', 'active_users', 'specific_users'])
  target_audience: 'all' | 'new_users' | 'active_users' | 'specific_users';

  @ApiProperty({ description: 'IDs des utilisateurs ciblés (si target_audience = specific_users)', required: false })
  @IsOptional()
  @IsArray()
  target_user_ids?: string[];

  @ApiProperty({ description: 'Activer la promotion immédiatement', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

