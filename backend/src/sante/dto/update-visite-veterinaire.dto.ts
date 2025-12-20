import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVisiteVeterinaireDto {
  @ApiPropertyOptional({ description: 'Date de la visite (ISO string)' })
  @IsOptional()
  @IsString()
  date_visite?: string;

  @ApiPropertyOptional({ description: 'Nom du vétérinaire' })
  @IsOptional()
  @IsString()
  veterinaire?: string;

  @ApiPropertyOptional({ description: 'Motif de la visite' })
  @IsOptional()
  @IsString()
  motif?: string;

  @ApiPropertyOptional({ description: 'IDs des animaux examinés' })
  @IsOptional()
  @IsString()
  animaux_examines?: string;

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

  @ApiPropertyOptional({ description: 'Coût en CFA' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cout?: number;

  @ApiPropertyOptional({ description: 'Date de la prochaine visite recommandée (ISO string)' })
  @IsOptional()
  @IsString()
  prochaine_visite?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
