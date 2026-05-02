import { IsString, IsInt, IsOptional, Min, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGestationDto {
  @ApiPropertyOptional({ description: 'ID de la truie' })
  @IsOptional()
  @IsString()
  truie_id?: string;

  @ApiPropertyOptional({ description: 'Nom de la truie' })
  @IsOptional()
  @IsString()
  truie_nom?: string;

  @ApiPropertyOptional({ description: 'ID du verrat' })
  @IsOptional()
  @IsString()
  verrat_id?: string;

  @ApiPropertyOptional({ description: 'Nom du verrat' })
  @IsOptional()
  @IsString()
  verrat_nom?: string;

  @ApiPropertyOptional({ description: 'Date de sautage (ISO string)' })
  @IsOptional()
  @IsString()
  date_sautage?: string;

  @ApiPropertyOptional({ description: 'Date de mise bas prévue (ISO string)' })
  @IsOptional()
  @IsString()
  date_mise_bas_prevue?: string;

  @ApiPropertyOptional({ description: 'Date de mise bas réelle (ISO string)' })
  @IsOptional()
  @IsString()
  date_mise_bas_reelle?: string;

  @ApiPropertyOptional({ description: 'Nombre de porcelets prévu' })
  @IsOptional()
  @IsInt()
  @Min(0)
  nombre_porcelets_prevu?: number;

  @ApiPropertyOptional({ description: 'Nombre de porcelets réel' })
  @IsOptional()
  @IsInt()
  @Min(0)
  nombre_porcelets_reel?: number;

  @ApiPropertyOptional({
    description: 'Statut de la gestation',
    enum: ['en_cours', 'terminee', 'annulee'],
  })
  @IsOptional()
  @IsIn(['en_cours', 'terminee', 'annulee'])
  statut?: 'en_cours' | 'terminee' | 'annulee';

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
