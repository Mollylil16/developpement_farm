import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMaladieDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiPropertyOptional({ description: "ID de l'animal (si maladie individuelle)" })
  @IsOptional()
  @IsString()
  animal_id?: string;

  @ApiPropertyOptional({ description: 'ID du lot (si épidémie)' })
  @IsOptional()
  @IsString()
  lot_id?: string;

  @ApiProperty({
    description: 'Type de maladie',
    enum: [
      'diarrhee',
      'respiratoire',
      'gale_parasites',
      'fievre',
      'boiterie',
      'digestive',
      'cutanee',
      'reproduction',
      'neurologique',
      'autre',
    ],
  })
  @IsEnum([
    'diarrhee',
    'respiratoire',
    'gale_parasites',
    'fievre',
    'boiterie',
    'digestive',
    'cutanee',
    'reproduction',
    'neurologique',
    'autre',
  ])
  type: string;

  @ApiProperty({ description: 'Nom de la maladie' })
  @IsString()
  nom_maladie: string;

  @ApiProperty({ description: 'Gravité', enum: ['faible', 'moderee', 'grave', 'critique'] })
  @IsEnum(['faible', 'moderee', 'grave', 'critique'])
  gravite: string;

  @ApiProperty({ description: 'Date de début (ISO string)' })
  @IsString()
  date_debut: string;

  @ApiPropertyOptional({ description: 'Date de fin/guérison (ISO string)' })
  @IsOptional()
  @IsString()
  date_fin?: string;

  @ApiProperty({ description: 'Description des symptômes' })
  @IsString()
  symptomes: string;

  @ApiPropertyOptional({ description: 'Diagnostic' })
  @IsOptional()
  @IsString()
  diagnostic?: string;

  @ApiPropertyOptional({ description: 'Maladie contagieuse', default: false })
  @IsOptional()
  @IsBoolean()
  contagieux?: boolean;

  @ApiPropertyOptional({ description: "Nombre d'animaux affectés" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  nombre_animaux_affectes?: number;

  @ApiPropertyOptional({ description: 'Nombre de décès' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nombre_deces?: number;

  @ApiPropertyOptional({ description: 'Nom du vétérinaire' })
  @IsOptional()
  @IsString()
  veterinaire?: string;

  @ApiPropertyOptional({ description: 'Coût du traitement en CFA' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cout_traitement?: number;

  @ApiPropertyOptional({ description: 'Maladie guérie', default: false })
  @IsOptional()
  @IsBoolean()
  gueri?: boolean;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
