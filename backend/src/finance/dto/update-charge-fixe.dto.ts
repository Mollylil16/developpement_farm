import { IsString, IsNumber, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FINANCE_LIMITS } from '../config/finance-validation.config';

export class UpdateChargeFixeDto {
  @ApiPropertyOptional({ description: 'Catégorie de la charge fixe' })
  @IsOptional()
  @IsEnum(['salaires', 'alimentation', 'entretien', 'vaccins', 'eau_electricite', 'autre'])
  categorie?: string;

  @ApiPropertyOptional({ description: 'Libellé de la charge fixe' })
  @IsOptional()
  @IsString()
  libelle?: string;

  @ApiPropertyOptional({
    description: `Montant de la charge fixe (${FINANCE_LIMITS.MIN_MONTANT} - ${FINANCE_LIMITS.MAX_MONTANT.toLocaleString('fr-FR')} FCFA)`,
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

  @ApiPropertyOptional({ description: 'Date de début (ISO string)' })
  @IsOptional()
  @IsString()
  date_debut?: string;

  @ApiPropertyOptional({ description: 'Fréquence de paiement' })
  @IsOptional()
  @IsEnum(['mensuel', 'trimestriel', 'annuel'])
  frequence?: string;

  @ApiPropertyOptional({ description: 'Jour de paiement (1-31)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  jour_paiement?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Statut', enum: ['actif', 'suspendu', 'termine'] })
  @IsOptional()
  @IsEnum(['actif', 'suspendu', 'termine'])
  statut?: string;
}
