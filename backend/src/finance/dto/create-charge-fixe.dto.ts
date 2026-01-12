import { IsString, IsNumber, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FINANCE_LIMITS } from '../config/finance-validation.config';

export class CreateChargeFixeDto {
  @ApiPropertyOptional({ description: 'ID du projet' })
  @IsOptional()
  @IsString()
  projet_id?: string;

  @ApiProperty({
    description: 'Catégorie de la charge fixe',
    enum: ['salaires', 'alimentation', 'entretien', 'vaccins', 'eau_electricite', 'autre'],
  })
  @IsEnum(['salaires', 'alimentation', 'entretien', 'vaccins', 'eau_electricite', 'autre'])
  categorie: string;

  @ApiProperty({ description: 'Libellé de la charge fixe' })
  @IsString()
  libelle: string;

  @ApiProperty({
    description: 'Montant de la charge fixe (0 - 1 milliard FCFA)',
    minimum: FINANCE_LIMITS.MIN_MONTANT,
    maximum: FINANCE_LIMITS.MAX_MONTANT,
  })
  @IsNumber()
  @Min(FINANCE_LIMITS.MIN_MONTANT, {
    message: `Le montant doit être supérieur ou égal à ${FINANCE_LIMITS.MIN_MONTANT} FCFA`,
  })
  @Max(FINANCE_LIMITS.MAX_MONTANT, {
    message: `Le montant ne peut pas dépasser ${FINANCE_LIMITS.MAX_MONTANT.toLocaleString('fr-FR')} FCFA (1 milliard)`,
  })
  montant: number;

  @ApiProperty({ description: 'Date de début (ISO string)' })
  @IsString()
  date_debut: string;

  @ApiProperty({ description: 'Fréquence de paiement', enum: ['mensuel', 'trimestriel', 'annuel'] })
  @IsEnum(['mensuel', 'trimestriel', 'annuel'])
  frequence: string;

  @ApiPropertyOptional({ description: 'Jour de paiement (1-31) pour fréquence mensuelle' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  jour_paiement?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
