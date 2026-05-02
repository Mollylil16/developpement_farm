import { IsString, IsNumber, IsOptional, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePurchaseRequestOfferDto {
  @ApiProperty({ description: 'ID de la demande d\'achat' })
  @IsString()
  purchaseRequestId: string;

  @ApiPropertyOptional({ description: 'ID du listing associé' })
  @IsOptional()
  @IsString()
  listingId?: string;

  @ApiProperty({ description: 'IDs des sujets proposés', type: [String] })
  @IsArray()
  @IsString({ each: true })
  subjectIds: string[];

  @ApiProperty({ description: 'Prix proposé par kg (FCFA)' })
  @IsNumber()
  @Min(0)
  proposedPricePerKg: number;

  @ApiProperty({ description: 'Prix total proposé (FCFA)' })
  @IsNumber()
  @Min(0)
  proposedTotalPrice: number;

  @ApiProperty({ description: 'Quantité proposée' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Date de disponibilité (ISO string)' })
  @IsOptional()
  @IsString()
  availableDate?: string;

  @ApiPropertyOptional({ description: 'Message optionnel' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Date d\'expiration (ISO string)' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

