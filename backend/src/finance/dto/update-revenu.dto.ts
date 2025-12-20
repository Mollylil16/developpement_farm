import { IsString, IsNumber, IsOptional, IsEnum, Min, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRevenuDto {
  @ApiPropertyOptional({ description: 'Montant du revenu' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  montant?: number;

  @ApiPropertyOptional({ description: 'Catégorie du revenu' })
  @IsOptional()
  @IsEnum(['vente_porc', 'vente_autre', 'subvention', 'autre'])
  categorie?: string;

  @ApiPropertyOptional({ description: 'Libellé de catégorie' })
  @IsOptional()
  @IsString()
  libelle_categorie?: string;

  @ApiPropertyOptional({ description: 'Date du revenu (ISO string)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Commentaire' })
  @IsOptional()
  @IsString()
  commentaire?: string;

  @ApiPropertyOptional({ description: "Photos (array d'URLs)", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Poids en kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  poids_kg?: number;

  @ApiPropertyOptional({ description: "ID de l'animal vendu" })
  @IsOptional()
  @IsString()
  animal_id?: string;
}
