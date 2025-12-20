import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStockAlimentDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({ description: "Nom de l'aliment" })
  @IsString()
  nom: string;

  @ApiPropertyOptional({ description: "Catégorie de l'aliment" })
  @IsOptional()
  @IsString()
  categorie?: string;

  @ApiPropertyOptional({ description: 'Quantité initiale' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantite_initiale?: number;

  @ApiProperty({ description: 'Unité de mesure', enum: ['kg', 'g', 'l', 'ml', 'sac', 'unite'] })
  @IsEnum(['kg', 'g', 'l', 'ml', 'sac', 'unite'])
  unite: string;

  @ApiPropertyOptional({ description: "Seuil d'alerte" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  seuil_alerte?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
