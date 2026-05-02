import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PeseeMode, PeriodeType } from './pesees-stats.dto';

export class PeseesEvolutionDto {
  @ApiProperty({ description: 'ID du projet', example: 'uuid' })
  @IsString()
  projet_id: string;

  @ApiProperty({ 
    description: 'Mode de suivi', 
    enum: PeseeMode,
    example: PeseeMode.INDIVIDUEL
  })
  @IsEnum(PeseeMode)
  mode: PeseeMode;

  @ApiPropertyOptional({ 
    description: 'Période de calcul', 
    enum: PeriodeType,
    default: PeriodeType.J30
  })
  @IsOptional()
  @IsEnum(PeriodeType)
  periode?: PeriodeType;

  @ApiPropertyOptional({ 
    description: 'IDs des sujets à inclure (optionnel, si non fourni retourne tous les sujets)', 
    type: [String],
    example: ['uuid1', 'uuid2']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sujet_ids?: string[];
}

