import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTraitementDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiPropertyOptional({ description: 'ID de la maladie liée' })
  @IsOptional()
  @IsString()
  maladie_id?: string;

  @ApiPropertyOptional({ description: "ID de l'animal" })
  @IsOptional()
  @IsString()
  animal_id?: string;

  @ApiPropertyOptional({ description: 'ID du lot' })
  @IsOptional()
  @IsString()
  lot_id?: string;

  @ApiPropertyOptional({ description: 'ID de la bande (mode batch)' })
  @IsOptional()
  @IsString()
  batch_id?: string;

  @ApiProperty({
    description: 'Type de traitement',
    enum: ['antibiotique', 'antiparasitaire', 'anti_inflammatoire', 'vitamine', 'vaccin', 'autre'],
  })
  @IsEnum(['antibiotique', 'antiparasitaire', 'anti_inflammatoire', 'vitamine', 'vaccin', 'autre'])
  type: string;

  @ApiProperty({ description: 'Nom du médicament' })
  @IsString()
  nom_medicament: string;

  @ApiProperty({
    description: "Voie d'administration",
    enum: ['orale', 'injectable', 'topique', 'alimentaire'],
  })
  @IsEnum(['orale', 'injectable', 'topique', 'alimentaire'])
  voie_administration: string;

  @ApiProperty({ description: 'Dosage (ex: "2ml/kg", "1 comprimé")' })
  @IsString()
  dosage: string;

  @ApiProperty({ description: 'Fréquence (ex: "2x/jour", "1x/semaine")' })
  @IsString()
  frequence: string;

  @ApiProperty({ description: 'Date de début (ISO string)' })
  @IsString()
  date_debut: string;

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

  @ApiPropertyOptional({ description: 'Traitement terminé', default: false })
  @IsOptional()
  @IsBoolean()
  termine?: boolean;

  @ApiPropertyOptional({ description: 'Traitement efficace' })
  @IsOptional()
  @IsBoolean()
  efficace?: boolean;

  @ApiPropertyOptional({ description: 'Effets secondaires observés' })
  @IsOptional()
  @IsString()
  effets_secondaires?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
