import { IsString, IsNumber, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateIngredientDto {
  @ApiPropertyOptional({ description: "Nom de l'ingrédient" })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional({ description: 'Unité de mesure' })
  @IsOptional()
  @IsEnum(['kg', 'g', 'l', 'ml', 'sac'])
  unite?: string;

  @ApiPropertyOptional({ description: 'Prix unitaire en CFA' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prix_unitaire?: number;

  @ApiPropertyOptional({ description: 'Pourcentage de protéines (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  proteine_pourcent?: number;

  @ApiPropertyOptional({ description: 'Énergie en kcal/kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  energie_kcal?: number;
}
