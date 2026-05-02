import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRapportCroissanceDto {
  @ApiProperty({ description: 'ID du projet auquel le rapport est associé', example: 'projet_123' })
  @IsString()
  @IsNotEmpty()
  projet_id: string;

  @ApiProperty({ description: 'Date du rapport (ISO 8601)', example: '2023-03-10' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Poids moyen des porcs en kg', example: 50.5 })
  @IsNumber()
  @Min(0)
  poids_moyen: number;

  @ApiProperty({ description: 'Nombre de porcs suivis', example: 25 })
  @IsNumber()
  @Min(1)
  nombre_porcs: number;

  @ApiPropertyOptional({ description: 'Gain quotidien moyen en kg', example: 0.8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gain_quotidien?: number;

  @ApiPropertyOptional({ description: 'Poids cible en kg', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  poids_cible?: number;

  @ApiPropertyOptional({
    description: 'Notes additionnelles',
    example: 'Bonne croissance cette semaine',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
