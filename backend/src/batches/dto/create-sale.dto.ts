import { IsString, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSaleDto {
  @ApiProperty({ description: 'ID de la bande' })
  @IsString()
  batch_id: string;

  @ApiProperty({ description: 'Nombre de porcs à vendre' })
  @IsNumber()
  @Min(1)
  count: number;

  @ApiProperty({ description: 'Date de vente (ISO string)' })
  @IsDateString()
  sale_date: string;

  @ApiProperty({ description: 'Poids total (kg)' })
  @IsNumber()
  @Min(0)
  total_weight_kg: number;

  @ApiProperty({ description: 'Prix total' })
  @IsNumber()
  @Min(0)
  total_price: number;

  @ApiPropertyOptional({ description: 'Prix au kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price_per_kg?: number;

  @ApiPropertyOptional({ description: 'Nom de l\'acheteur' })
  @IsOptional()
  @IsString()
  buyer_name?: string;

  @ApiPropertyOptional({ description: 'Contact de l\'acheteur' })
  @IsOptional()
  @IsString()
  buyer_contact?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

