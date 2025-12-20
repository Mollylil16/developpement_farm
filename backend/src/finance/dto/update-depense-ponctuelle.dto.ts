import { IsString, IsNumber, IsOptional, IsEnum, IsInt, Min, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDepensePonctuelleDto {
  @ApiPropertyOptional({ description: 'Montant de la dépense' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  montant?: number;

  @ApiPropertyOptional({ description: 'Catégorie de la dépense' })
  @IsOptional()
  @IsEnum([
    'vaccins',
    'medicaments',
    'alimentation',
    'veterinaire',
    'entretien',
    'equipements',
    'amenagement_batiment',
    'equipement_lourd',
    'achat_sujet',
    'autre',
  ])
  categorie?: string;

  @ApiPropertyOptional({ description: 'Libellé de catégorie' })
  @IsOptional()
  @IsString()
  libelle_categorie?: string;

  @ApiPropertyOptional({ description: 'Type OPEX/CAPEX' })
  @IsOptional()
  @IsEnum(['opex', 'capex'])
  type_opex_capex?: string;

  @ApiPropertyOptional({ description: "Durée d'amortissement en mois" })
  @IsOptional()
  @IsInt()
  @Min(1)
  duree_amortissement_mois?: number;

  @ApiPropertyOptional({ description: 'Date de la dépense (ISO string)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Commentaire' })
  @IsOptional()
  @IsString()
  commentaire?: string;

  @ApiPropertyOptional({ description: "Photos (array d'URLs)", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}
