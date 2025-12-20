import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTraitementDto {
  @ApiPropertyOptional({ description: 'Type de traitement' })
  @IsOptional()
  @IsEnum(['antibiotique', 'antiparasitaire', 'anti_inflammatoire', 'vitamine', 'vaccin', 'autre'])
  type?: string;

  @ApiPropertyOptional({ description: 'Nom du médicament' })
  @IsOptional()
  @IsString()
  nom_medicament?: string;

  @ApiPropertyOptional({ description: "Voie d'administration" })
  @IsOptional()
  @IsEnum(['orale', 'injectable', 'topique', 'alimentaire'])
  voie_administration?: string;

  @ApiPropertyOptional({ description: 'Dosage' })
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiPropertyOptional({ description: 'Fréquence' })
  @IsOptional()
  @IsString()
  frequence?: string;

  @ApiPropertyOptional({ description: 'Date de début (ISO string)' })
  @IsOptional()
  @IsString()
  date_debut?: string;

  @ApiPropertyOptional({ description: 'Date de fin (ISO string)' })
  @IsOptional()
  @IsString()
  date_fin?: string;

  @ApiPropertyOptional({ description: 'Durée en jours' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duree_jours?: number;

  @ApiPropertyOptional({ description: "Temps d'attente avant abattage (jours)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  temps_attente_jours?: number;

  @ApiPropertyOptional({ description: 'Nom du vétérinaire' })
  @IsOptional()
  @IsString()
  veterinaire?: string;

  @ApiPropertyOptional({ description: 'Coût en CFA' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cout?: number;

  @ApiPropertyOptional({ description: 'Traitement terminé' })
  @IsOptional()
  @IsBoolean()
  termine?: boolean;

  @ApiPropertyOptional({ description: 'Traitement efficace' })
  @IsOptional()
  @IsBoolean()
  efficace?: boolean;

  @ApiPropertyOptional({ description: 'Effets secondaires' })
  @IsOptional()
  @IsString()
  effets_secondaires?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
