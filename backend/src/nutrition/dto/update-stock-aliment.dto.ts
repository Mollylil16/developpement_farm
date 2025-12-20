import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStockAlimentDto {
  @ApiPropertyOptional({ description: "Nom de l'aliment" })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional({ description: "Catégorie de l'aliment" })
  @IsOptional()
  @IsString()
  categorie?: string;

  @ApiPropertyOptional({ description: 'Unité de mesure' })
  @IsOptional()
  @IsEnum(['kg', 'g', 'l', 'ml', 'sac', 'unite'])
  unite?: string;

  @ApiPropertyOptional({ description: "Seuil d'alerte (null pour désactiver)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  seuil_alerte?: number | null;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
