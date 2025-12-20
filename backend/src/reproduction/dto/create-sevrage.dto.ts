import { IsString, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSevrageDto {
  @ApiProperty({ description: 'ID de la gestation' })
  @IsString()
  gestation_id: string;

  @ApiProperty({ description: 'Date de sevrage (ISO string)' })
  @IsString()
  date_sevrage: string;

  @ApiProperty({ description: 'Nombre de porcelets sevrés' })
  @IsInt()
  @Min(0)
  nombre_porcelets_sevres: number;

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
