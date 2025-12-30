import { IsString, IsEnum, IsOptional, IsNumber, IsArray, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVaccinationDto {
  @ApiPropertyOptional({ description: 'IDs des animaux vaccinés (array)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  animal_ids?: string[];

  @ApiPropertyOptional({ description: 'Type de prophylaxie' })
  @IsOptional()
  @IsEnum([
    'vitamine',
    'deparasitant',
    'fer',
    'antibiotique_preventif',
    'vaccin_obligatoire',
    'autre_traitement',
  ])
  type_prophylaxie?: string;

  @ApiPropertyOptional({ description: 'Nom du produit administré' })
  @IsOptional()
  @IsString()
  produit_administre?: string;

  @ApiPropertyOptional({ description: 'URI de la photo du flacon' })
  @IsOptional()
  @IsString()
  photo_flacon?: string;

  @ApiPropertyOptional({ description: 'Date de vaccination (ISO string)' })
  @IsOptional()
  @IsString()
  date_vaccination?: string;

  @ApiPropertyOptional({ description: 'Date du prochain rappel (ISO string)' })
  @IsOptional()
  @IsString()
  date_rappel?: string;

  @ApiPropertyOptional({ description: 'Numéro de lot du vaccin' })
  @IsOptional()
  @IsString()
  numero_lot_vaccin?: string;

  @ApiPropertyOptional({ description: 'Dosage' })
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiPropertyOptional({ description: 'Unité de dosage' })
  @IsOptional()
  @IsString()
  unite_dosage?: string;

  @ApiPropertyOptional({ description: 'Raison du traitement' })
  @IsOptional()
  @IsEnum([
    'suivi_normal',
    'renforcement_sanitaire',
    'prevention',
    'traitement_curatif',
    'urgence_sanitaire',
    'autre',
  ])
  raison_traitement?: string;

  @ApiPropertyOptional({ description: 'Raison autre' })
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

  @ApiPropertyOptional({ description: 'Statut' })
  @IsOptional()
  @IsEnum(['planifie', 'effectue', 'en_retard', 'annule'])
  statut?: string;

  @ApiPropertyOptional({ description: 'Effets secondaires' })
  @IsOptional()
  @IsString()
  effets_secondaires?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'ID de la bande (mode batch)' })
  @IsOptional()
  @IsString()
  batch_id?: string;

  @ApiPropertyOptional({ description: 'Nombre de sujets vaccinés (mode batch)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nombre_sujets_vaccines?: number;
}
