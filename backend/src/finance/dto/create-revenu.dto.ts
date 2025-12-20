import { IsString, IsNumber, IsOptional, IsEnum, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRevenuDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({ description: 'Montant du revenu' })
  @IsNumber()
  @Min(0)
  montant: number;

  @ApiProperty({
    description: 'Catégorie du revenu',
    enum: ['vente_porc', 'vente_autre', 'subvention', 'autre'],
  })
  @IsEnum(['vente_porc', 'vente_autre', 'subvention', 'autre'])
  categorie: string;

  @ApiPropertyOptional({ description: 'Libellé de catégorie si "autre" est sélectionné' })
  @IsOptional()
  @IsString()
  libelle_categorie?: string;

  @ApiProperty({ description: 'Date du revenu (ISO string)' })
  @IsString()
  date: string;

  @ApiPropertyOptional({ description: 'Description (ex: nombre de porcs vendus)' })
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

  @ApiPropertyOptional({ description: 'Poids en kg (pour ventes de porcs)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  poids_kg?: number;

  @ApiPropertyOptional({ description: "ID de l'animal vendu" })
  @IsOptional()
  @IsString()
  animal_id?: string;
}
