import { IsString, IsNumber, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateChargeFixeDto {
  @ApiPropertyOptional({ description: 'Catégorie de la charge fixe' })
  @IsOptional()
  @IsEnum(['salaires', 'alimentation', 'entretien', 'vaccins', 'eau_electricite', 'autre'])
  categorie?: string;

  @ApiPropertyOptional({ description: 'Libellé de la charge fixe' })
  @IsOptional()
  @IsString()
  libelle?: string;

  @ApiPropertyOptional({ description: 'Montant de la charge fixe' })
  @IsOptional()
  @IsNumber()
  @Min(0)
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
