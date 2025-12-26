import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class PopulationBreakdownDto {
  @IsNumber()
  @Min(0)
  male_count: number;

  @IsNumber()
  @Min(0)
  female_count: number;

  @IsNumber()
  @Min(0)
  castrated_count: number;
}

export class CreateBatchWithPigsDto {
  @IsString()
  projet_id: string;

  @IsString()
  pen_name: string;

  @IsEnum([
    'truie_reproductrice',
    'verrat_reproducteur',
    'porcelets',
    'porcs_croissance',
    'porcs_engraissement',
  ])
  category:
    | 'truie_reproductrice'
    | 'verrat_reproducteur'
    | 'porcelets'
    | 'porcs_croissance'
    | 'porcs_engraissement';

  // Population - Optionnel (pour loge vide)
  @IsObject()
  @ValidateNested()
  @Type(() => PopulationBreakdownDto)
  @IsOptional()
  population?: PopulationBreakdownDto;

  // Caractéristiques moyennes - Optionnel (pour loge vide)
  @IsNumber()
  @Min(0)
  @Max(60)
  @IsOptional()
  average_age_months?: number;

  @IsNumber()
  @Min(0)
  @Max(500)
  @IsOptional()
  average_weight_kg?: number;

  // Métadonnées
  @IsString()
  @IsOptional()
  notes?: string;
}

