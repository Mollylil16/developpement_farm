import { IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGestationDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({ description: 'ID de la truie' })
  @IsString()
  truie_id: string;

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

  @ApiProperty({ description: 'Date de sautage (ISO string)' })
  @IsString()
  date_sautage: string;

  @ApiProperty({ description: 'Nombre de porcelets prévu' })
  @IsInt()
  @Min(0)
  nombre_porcelets_prevu: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
