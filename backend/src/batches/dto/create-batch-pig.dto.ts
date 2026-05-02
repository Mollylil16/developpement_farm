import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class CreateBatchPigDto {
  @IsString()
  batch_id: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(['male', 'female', 'castrated'])
  sex: 'male' | 'female' | 'castrated';

  @IsDateString()
  @IsOptional()
  birth_date?: string;

  @IsNumber()
  @Min(0)
  @Max(60)
  @IsOptional()
  age_months?: number;

  @IsNumber()
  @Min(0)
  @Max(500)
  current_weight_kg: number;

  @IsEnum(['birth', 'purchase', 'transfer', 'other'])
  origin: 'birth' | 'purchase' | 'transfer' | 'other';

  @IsString()
  @IsOptional()
  origin_details?: string;

  @IsString()
  @IsOptional()
  supplier_name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  purchase_price?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  photo_url?: string;

  @IsDateString()
  @IsOptional()
  entry_date?: string;
}

