import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsObject,
  ValidateNested,
  IsOptional,
  IsArray,
  IsInt,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LocationDto {
  @ApiProperty({ description: 'Latitude', example: 48.8566 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 2.3522 })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Adresse complète', example: '123 Rue de la Ferme', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Ville', example: 'Paris', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'Région', example: 'Île-de-France', required: false })
  @IsOptional()
  @IsString()
  region?: string;
}

class SaleTermsDto {
  @ApiProperty({ description: 'Transport', example: 'buyer_responsibility' })
  @IsString()
  @IsNotEmpty()
  transport: string;

  @ApiProperty({ description: 'Abattage', example: 'buyer_responsibility' })
  @IsString()
  @IsNotEmpty()
  slaughter: string;

  @ApiPropertyOptional({ description: 'Conditions de paiement', example: 'on_delivery' })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiProperty({ description: 'Garantie', example: 'Garantie sanitaire...' })
  @IsString()
  @IsNotEmpty()
  warranty: string;

  @ApiProperty({ description: "Politique d'annulation", example: 'Annulation possible...' })
  @IsString()
  @IsNotEmpty()
  cancellationPolicy: string;
}

export class CreateBatchListingDto {
  @ApiProperty({ description: 'ID de la bande', example: 'batch_123' })
  @IsString()
  @IsNotEmpty()
  batchId: string;

  @ApiProperty({ description: 'ID de la ferme (projet)', example: 'projet_789' })
  @IsString()
  @IsNotEmpty()
  farmId: string;

  @ApiProperty({
    description: 'Nombre de porcs à vendre (si null, vend toute la bande)',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  pigCount?: number;

  @ApiPropertyOptional({
    description: 'IDs spécifiques des porcs à vendre (si fourni, pigCount est ignoré)',
    example: ['pig_1', 'pig_2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pigIds?: string[];

  @ApiProperty({ description: 'Prix au kg', example: 2500 })
  @IsNumber()
  @Min(0)
  pricePerKg: number;

  @ApiPropertyOptional({ description: 'Poids moyen en kg (optionnel - calculé automatiquement depuis les poids réels)', example: 50.5 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  averageWeight?: number;

  @ApiProperty({ description: 'Date de dernière pesée (ISO 8601)', example: '2023-03-10' })
  @IsString()
  @IsNotEmpty()
  lastWeightDate: string;

  @ApiProperty({ description: 'Localisation', type: LocationDto })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiPropertyOptional({ description: 'Conditions de vente', type: SaleTermsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SaleTermsDto)
  saleTerms?: SaleTermsDto;
}

