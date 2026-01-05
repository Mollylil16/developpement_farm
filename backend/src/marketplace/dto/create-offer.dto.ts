import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsArray,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferDto {
  @ApiProperty({ description: 'ID du listing', example: 'listing_123' })
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @ApiProperty({ description: 'IDs des sujets sélectionnés', example: ['animal_1', 'animal_2'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  subjectIds: string[];

  @ApiProperty({ description: "ID de l'acheteur", example: 'user_456' })
  @IsString()
  @IsNotEmpty()
  buyerId: string;

  @ApiProperty({ description: 'Prix proposé', example: 125000 })
  @IsNumber()
  @Min(0)
  proposedPrice: number;

  @ApiPropertyOptional({
    description: 'Message optionnel',
    example: 'Je suis intéressé par cette offre',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: "Date d'expiration (ISO 8601)", example: '2023-04-10' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Date de récupération souhaitée (ISO 8601)', example: '2023-04-15' })
  @IsOptional()
  @IsString()
  dateRecuperationSouhaitee?: string;
}
