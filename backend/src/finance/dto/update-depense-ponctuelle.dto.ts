import { IsString, IsNumber, IsOptional, IsEnum, IsInt, Min, Max, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  FINANCE_LIMITS,
  FINANCE_AMORTIZATION_LIMITS,
} from '../config/finance-validation.config';

export class UpdateDepensePonctuelleDto {
  @ApiPropertyOptional({
    description: `Montant de la dépense (${FINANCE_LIMITS.MIN_MONTANT} - ${FINANCE_LIMITS.MAX_MONTANT.toLocaleString('fr-FR')} FCFA)`,
    minimum: FINANCE_LIMITS.MIN_MONTANT,
    maximum: FINANCE_LIMITS.MAX_MONTANT,
  })
  @IsOptional()
  @IsNumber()
  @Min(FINANCE_LIMITS.MIN_MONTANT, {
    message: `Le montant doit être supérieur ou égal à ${FINANCE_LIMITS.MIN_MONTANT} FCFA`,
  })
  @Max(FINANCE_LIMITS.MAX_MONTANT, {
    message: `Le montant ne peut pas dépasser ${FINANCE_LIMITS.MAX_MONTANT.toLocaleString('fr-FR')} FCFA (1 milliard)`,
  })
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

  @ApiPropertyOptional({
    description: `Durée d'amortissement en mois (${FINANCE_AMORTIZATION_LIMITS.MIN_DUREE_MOIS} - ${FINANCE_AMORTIZATION_LIMITS.MAX_DUREE_MOIS} mois)`,
    minimum: FINANCE_AMORTIZATION_LIMITS.MIN_DUREE_MOIS,
    maximum: FINANCE_AMORTIZATION_LIMITS.MAX_DUREE_MOIS,
  })
  @IsOptional()
  @IsInt()
  @Min(FINANCE_AMORTIZATION_LIMITS.MIN_DUREE_MOIS, {
    message: `La durée d'amortissement doit être d'au moins ${FINANCE_AMORTIZATION_LIMITS.MIN_DUREE_MOIS} mois`,
  })
  @Max(FINANCE_AMORTIZATION_LIMITS.MAX_DUREE_MOIS, {
    message: `La durée d'amortissement ne peut pas dépasser ${FINANCE_AMORTIZATION_LIMITS.MAX_DUREE_MOIS} mois (30 ans)`,
  })
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
