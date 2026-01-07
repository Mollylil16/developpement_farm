import { IsString, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteSaleDto {
  @ApiProperty({ description: 'ID du listing vendu' })
  @IsString()
  listingId: string;

  @ApiProperty({ description: 'ID de l\'acheteur' })
  @IsString()
  buyerId: string;

  @ApiProperty({ description: 'Prix final de la vente', minimum: 0 })
  @IsNumber()
  @IsPositive()
  @Min(0)
  finalPrice: number;

  @ApiPropertyOptional({ description: 'Mode de paiement' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Notes additionnelles' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Date de récupération prévue (ISO string)' })
  @IsOptional()
  @IsString()
  dateRecuperation?: string;
}

export class SaleCleanupResult {
  listingsRemoved: number;
  listingsUpdated: number;
  animalsUpdated: number;
}

export class SaleTransactionInfo {
  id: string;
  amount: number;
  seller: { id: string; name?: string };
  buyer: { id: string; name?: string };
  listing: { 
    id: string; 
    type: 'individual' | 'batch';
    subjectIds: string[];
  };
}

export class SaleFinanceInfo {
  revenueId: string;
  amount: number;
  venteId: string;
}

export class CompleteSaleResponseDto {
  success: boolean;
  transaction: SaleTransactionInfo;
  cleanup: SaleCleanupResult;
  finance: SaleFinanceInfo;
  message?: string;
}

