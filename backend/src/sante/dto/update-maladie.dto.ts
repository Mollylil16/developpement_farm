import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMaladieDto {
  @ApiPropertyOptional({ description: 'Type de maladie' })
  @IsOptional()
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
  type?: string;

  @ApiPropertyOptional({ description: 'Nom de la maladie' })
  @IsOptional()
  @IsString()
  nom_maladie?: string;

  @ApiPropertyOptional({ description: 'Gravité' })
  @IsOptional()
  @IsEnum(['faible', 'moderee', 'grave', 'critique'])
  gravite?: string;

  @ApiPropertyOptional({ description: 'Date de début (ISO string)' })
  @IsOptional()
  @IsString()
  date_debut?: string;

  @ApiPropertyOptional({ description: 'Date de fin/guérison (ISO string)' })
  @IsOptional()
  @IsString()
  date_fin?: string;

  @ApiPropertyOptional({ description: 'Description des symptômes' })
  @IsOptional()
  @IsString()
  symptomes?: string;

  @ApiPropertyOptional({ description: 'Diagnostic' })
  @IsOptional()
  @IsString()
  diagnostic?: string;

  @ApiPropertyOptional({ description: 'Maladie contagieuse' })
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

  @ApiPropertyOptional({ description: 'Maladie guérie' })
  @IsOptional()
  @IsBoolean()
  gueri?: boolean;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
