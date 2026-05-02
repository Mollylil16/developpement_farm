import { IsString, IsNumber, IsOptional, IsObject, IsEnum, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryLocationDto } from './create-purchase-request.dto';

export class UpdatePurchaseRequestDto {
  @ApiPropertyOptional({ description: 'Titre de la demande' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Race souhaitée' })
  @IsOptional()
  @IsString()
  race?: string;

  @ApiPropertyOptional({ description: 'Poids minimum (kg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minWeight?: number;

  @ApiPropertyOptional({ description: 'Poids maximum (kg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxWeight?: number;

  @ApiPropertyOptional({ description: 'Catégorie d\'âge', enum: ['jeunes', 'engraissement', 'finis', 'tous'] })
  @IsOptional()
  @IsEnum(['jeunes', 'engraissement', 'finis', 'tous'])
  ageCategory?: string;

  @ApiPropertyOptional({ description: 'Âge minimum en mois' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAgeMonths?: number;

  @ApiPropertyOptional({ description: 'Âge maximum en mois' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAgeMonths?: number;

  @ApiPropertyOptional({ description: 'Quantité souhaitée' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Localisation de livraison', type: DeliveryLocationDto })
  @IsOptional()
  @IsObject()
  deliveryLocation?: DeliveryLocationDto;

  @ApiPropertyOptional({ description: 'Prix maximum par kg (FCFA)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPricePerKg?: number;

  @ApiPropertyOptional({ description: 'Prix total maximum (FCFA)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTotalPrice?: number;

  @ApiPropertyOptional({ description: 'Date de livraison souhaitée (ISO string)' })
  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @ApiPropertyOptional({ description: 'Début de période de livraison (ISO string)' })
  @IsOptional()
  @IsString()
  deliveryPeriodStart?: string;

  @ApiPropertyOptional({ description: 'Fin de période de livraison (ISO string)' })
  @IsOptional()
  @IsString()
  deliveryPeriodEnd?: string;

  @ApiPropertyOptional({ description: 'Message optionnel' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Statut', enum: ['published', 'fulfilled', 'expired', 'archived', 'cancelled'] })
  @IsOptional()
  @IsEnum(['published', 'fulfilled', 'expired', 'archived', 'cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: 'Date d\'expiration (ISO string)' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

