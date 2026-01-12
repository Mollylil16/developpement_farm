import { IsString, IsNumber, IsOptional, IsEnum, Min, Max, IsInt, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FINANCE_LIMITS,
  FINANCE_WEIGHT_LIMITS,
  FINANCE_ANIMAL_LIMITS,
} from '../config/finance-validation.config';

export class CreateRevenuDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({
    description: 'Montant du revenu (0 - 1 milliard FCFA)',
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

  @ApiPropertyOptional({
    description: `Poids en kg (pour ventes de porcs) (${FINANCE_WEIGHT_LIMITS.MIN_POIDS_KG} - ${FINANCE_WEIGHT_LIMITS.MAX_POIDS_KG} kg)`,
    minimum: FINANCE_WEIGHT_LIMITS.MIN_POIDS_KG,
    maximum: FINANCE_WEIGHT_LIMITS.MAX_POIDS_KG,
  })
  @IsOptional()
  @IsInt()
  @Min(FINANCE_WEIGHT_LIMITS.MIN_POIDS_KG, {
    message: `Le poids doit être d'au moins ${FINANCE_WEIGHT_LIMITS.MIN_POIDS_KG} kg`,
  })
  @Max(FINANCE_WEIGHT_LIMITS.MAX_POIDS_KG, {
    message: `Le poids ne peut pas dépasser ${FINANCE_WEIGHT_LIMITS.MAX_POIDS_KG} kg`,
  })
  poids_kg?: number;

  @ApiPropertyOptional({ description: "ID de l'animal vendu" })
  @IsOptional()
  @IsString()
  animal_id?: string;
}
