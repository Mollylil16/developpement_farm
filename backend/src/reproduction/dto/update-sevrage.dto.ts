import { IsString, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSevrageDto {
  @ApiPropertyOptional({ description: 'Date de sevrage (ISO string)' })
  @IsOptional()
  @IsString()
  date_sevrage?: string;

  @ApiPropertyOptional({ description: 'Nombre de porcelets sevrés' })
  @IsOptional()
  @IsInt()
  @Min(0)
  nombre_porcelets_sevres?: number;

  @ApiPropertyOptional({ description: 'Poids moyen au sevrage (kg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  poids_moyen_sevrage?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
