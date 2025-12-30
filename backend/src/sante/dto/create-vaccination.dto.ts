import { IsString, IsEnum, IsOptional, IsNumber, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVaccinationDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiPropertyOptional({ description: 'ID du calendrier de vaccination' })
  @IsOptional()
  @IsString()
  calendrier_id?: string;

  @ApiPropertyOptional({ description: 'IDs des animaux vaccinés (array)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  animal_ids?: string[];

  @ApiPropertyOptional({ description: 'ID du lot' })
  @IsOptional()
  @IsString()
  lot_id?: string;

  @ApiPropertyOptional({ description: 'ID de la bande (mode batch)' })
  @IsOptional()
  @IsString()
  batch_id?: string;

  @ApiPropertyOptional({ description: 'Nombre de sujets vaccinés (mode batch)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nombre_sujets_vaccines?: number;

  @ApiProperty({
    description: 'Type de prophylaxie',
    enum: [
      'vitamine',
      'deparasitant',
      'fer',
      'antibiotique_preventif',
      'vaccin_obligatoire',
      'autre_traitement',
    ],
  })
  @IsEnum([
    'vitamine',
    'deparasitant',
    'fer',
    'antibiotique_preventif',
    'vaccin_obligatoire',
    'autre_traitement',
  ])
  type_prophylaxie: string;

  @ApiPropertyOptional({ description: 'Type de vaccin (pour compatibilité)' })
  @IsOptional()
  @IsEnum(['rouget', 'parvovirose', 'mal_rouge', 'circovirus', 'mycoplasme', 'grippe', 'autre'])
  vaccin?: string;

  @ApiPropertyOptional({ description: 'Nom du vaccin' })
  @IsOptional()
  @IsString()
  nom_vaccin?: string;

  @ApiProperty({ description: 'Nom du produit administré' })
  @IsString()
  produit_administre: string;

  @ApiPropertyOptional({ description: 'URI de la photo du flacon' })
  @IsOptional()
  @IsString()
  photo_flacon?: string;

  @ApiProperty({ description: 'Date de vaccination (ISO string)' })
  @IsString()
  date_vaccination: string;

  @ApiPropertyOptional({ description: 'Date du prochain rappel (ISO string)' })
  @IsOptional()
  @IsString()
  date_rappel?: string;

  @ApiPropertyOptional({ description: 'Numéro de lot du vaccin' })
  @IsOptional()
  @IsString()
  numero_lot_vaccin?: string;

  @ApiProperty({ description: 'Dosage (ex: "2ml", "1cc", "50mg")' })
  @IsString()
  dosage: string;

  @ApiPropertyOptional({ description: 'Unité de dosage (ml, mg, cc, etc.)' })
  @IsOptional()
  @IsString()
  unite_dosage?: string;

  @ApiProperty({
    description: 'Raison du traitement',
    enum: [
      'suivi_normal',
      'renforcement_sanitaire',
      'prevention',
      'traitement_curatif',
      'urgence_sanitaire',
      'autre',
    ],
  })
  @IsEnum([
    'suivi_normal',
    'renforcement_sanitaire',
    'prevention',
    'traitement_curatif',
    'urgence_sanitaire',
    'autre',
  ])
  raison_traitement: string;

  @ApiPropertyOptional({ description: 'Raison autre (si raison_traitement = "autre")' })
  @IsOptional()
  @IsString()
  raison_autre?: string;

  @ApiPropertyOptional({ description: 'Nom du vétérinaire' })
  @IsOptional()
  @IsString()
  veterinaire?: string;

  @ApiPropertyOptional({ description: 'Coût en CFA' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cout?: number;

  @ApiPropertyOptional({
    description: 'Statut',
    enum: ['planifie', 'effectue', 'en_retard', 'annule'],
    default: 'effectue',
  })
  @IsOptional()
  @IsEnum(['planifie', 'effectue', 'en_retard', 'annule'])
  statut?: string;

  @ApiPropertyOptional({ description: 'Effets secondaires observés' })
  @IsOptional()
  @IsString()
  effets_secondaires?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
