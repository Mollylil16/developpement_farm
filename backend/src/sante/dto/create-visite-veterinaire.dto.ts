import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVisiteVeterinaireDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({ description: 'Date de la visite (ISO string)' })
  @IsString()
  date_visite: string;

  @ApiProperty({ description: 'Nom du vétérinaire' })
  @IsString()
  veterinaire: string;

  @ApiProperty({ description: 'Motif de la visite' })
  @IsString()
  motif: string;

  @ApiPropertyOptional({
    description: 'IDs des animaux examinés (séparés par virgules ou JSON array)',
  })
  @IsOptional()
  @IsString()
  animaux_examines?: string;

  @ApiPropertyOptional({
    description: 'ID de la bande associée à la visite (mode batch)',
  })
  @IsOptional()
  @IsString()
  batch_id?: string;

  @ApiPropertyOptional({ description: 'Diagnostic' })
  @IsOptional()
  @IsString()
  diagnostic?: string;

  @ApiPropertyOptional({ description: 'Prescriptions' })
  @IsOptional()
  @IsString()
  prescriptions?: string;

  @ApiPropertyOptional({ description: 'Recommandations' })
  @IsOptional()
  @IsString()
  recommandations?: string;

  @ApiPropertyOptional({ description: 'Traitement prescrit' })
  @IsOptional()
  @IsString()
  traitement?: string;

  @ApiProperty({ description: 'Coût en CFA' })
  @IsNumber()
  @Min(0)
  cout: number;

  @ApiPropertyOptional({ description: 'Date de la prochaine visite recommandée (ISO string)' })
  @IsOptional()
  @IsString()
  prochaine_visite?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
