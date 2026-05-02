import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRationBudgetDto {
  @ApiPropertyOptional({ description: 'Nom du budget' })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional({ description: 'Type de porc' })
  @IsOptional()
  @IsEnum(['porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance'])
  type_porc?: string;

  @ApiPropertyOptional({ description: 'Poids moyen en kg' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  poids_moyen_kg?: number;

  @ApiPropertyOptional({ description: 'Nombre de porcs' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  nombre_porcs?: number;

  @ApiPropertyOptional({ description: 'Durée en jours' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duree_jours?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
