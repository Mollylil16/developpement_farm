import { IsString, IsNumber, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIngredientDto {
  @ApiProperty({ description: "Nom de l'ingrédient" })
  @IsString()
  nom: string;

  @ApiProperty({ description: 'Unité de mesure', enum: ['kg', 'g', 'l', 'ml', 'sac'] })
  @IsEnum(['kg', 'g', 'l', 'ml', 'sac'])
  unite: string;

  @ApiProperty({ description: 'Prix unitaire en CFA' })
  @IsNumber()
  @Min(0)
  prix_unitaire: number;

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
