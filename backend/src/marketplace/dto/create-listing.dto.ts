import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsObject,
  ValidateNested,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListingPhotoDto } from './listing-photo.dto';

class LocationDto {
  @ApiProperty({ description: 'Latitude', example: 48.8566 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 2.3522 })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Adresse complète', example: '123 Rue de la Ferme' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'Ville', example: 'Paris' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Région', example: 'Île-de-France' })
  @IsString()
  @IsNotEmpty()
  region: string;
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

export class CreateListingDto {
  @ApiProperty({ description: 'ID du sujet (animal)', example: 'animal_123' })
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({ description: 'ID du producteur', example: 'user_456' })
  @IsString()
  @IsNotEmpty()
  producerId: string;

  @ApiProperty({ description: 'ID de la ferme (projet)', example: 'projet_789' })
  @IsString()
  @IsNotEmpty()
  farmId: string;

  @ApiProperty({ description: 'Prix au kg', example: 2500 })
  @IsNumber()
  @Min(0)
  pricePerKg: number;

  @ApiProperty({ description: 'Poids en kg', example: 50.5 })
  @IsNumber()
  @Min(0.01)
  weight: number;

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

  @ApiPropertyOptional({ 
    description: 'Photos du listing', 
    type: [ListingPhotoDto],
    example: [{ url: '/uploads/marketplace/photo1.jpg', order: 1 }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListingPhotoDto)
  @IsOptional()
  photos?: ListingPhotoDto[];
}
