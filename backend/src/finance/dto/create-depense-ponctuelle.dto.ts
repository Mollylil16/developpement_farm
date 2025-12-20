import { IsString, IsNumber, IsOptional, IsEnum, IsInt, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepensePonctuelleDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({ description: 'Montant de la dépense' })
  @IsNumber()
  @Min(0)
  montant: number;

  @ApiProperty({
    description: 'Catégorie de la dépense',
    enum: [
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
    ],
  })
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
  categorie: string;

  @ApiPropertyOptional({ description: 'Libellé de catégorie si "autre" est sélectionné' })
  @IsOptional()
  @IsString()
  libelle_categorie?: string;

  @ApiPropertyOptional({ description: 'Type OPEX/CAPEX', enum: ['opex', 'capex'] })
  @IsOptional()
  @IsEnum(['opex', 'capex'])
  type_opex_capex?: string;

  @ApiPropertyOptional({ description: "Durée d'amortissement en mois (pour CAPEX)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  duree_amortissement_mois?: number;

  @ApiProperty({ description: 'Date de la dépense (ISO string)' })
  @IsString()
  date: string;

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
