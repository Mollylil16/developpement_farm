import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';

export class RemovePigDto {
  @IsString()
  pig_id: string;

  @IsEnum([
    'sale',
    'death',
    'donation',
    'personal_consumption',
    'transfer_out',
    'other',
  ])
  removal_reason:
    | 'sale'
    | 'death'
    | 'donation'
    | 'personal_consumption'
    | 'transfer_out'
    | 'other';

  @IsString()
  @IsOptional()
  removal_details?: string;

  // Pour vente
  @IsNumber()
  @Min(0)
  @IsOptional()
  sale_price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  sale_weight_kg?: number;

  @IsString()
  @IsOptional()
  buyer_name?: string;

  // Pour mortalité
  @IsString()
  @IsOptional()
  death_cause?: string;

  @IsString()
  @IsOptional()
  veterinary_report?: string;

  @IsDateString()
  @IsOptional()
  removal_date?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

