import { IsString, IsNumber, IsOptional, IsObject, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeliveryLocationDto {
  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Adresse' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Ville' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Région' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Département' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Rayon en km' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  radiusKm?: number;
}

export class CreatePurchaseRequestDto {
  @ApiProperty({ description: 'Titre de la demande' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Race souhaitée' })
  @IsString()
  race: string;

  @ApiProperty({ description: 'Poids minimum (kg)' })
  @IsNumber()
  @Min(0)
  minWeight: number;

  @ApiProperty({ description: 'Poids maximum (kg)' })
  @IsNumber()
  @Min(0)
  maxWeight: number;

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

  @ApiProperty({ description: 'Quantité souhaitée' })
  @IsNumber()
  @Min(1)
  quantity: number;

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

  @ApiPropertyOptional({ description: 'Date d\'expiration (ISO string)' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

