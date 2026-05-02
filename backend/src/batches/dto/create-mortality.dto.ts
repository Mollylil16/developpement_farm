import { IsString, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMortalityDto {
  @ApiProperty({ description: 'ID de la bande' })
  @IsString()
  batch_id: string;

  @ApiProperty({ description: 'Nombre de porcs morts', default: 1 })
  @IsNumber()
  @Min(1)
  count: number;

  @ApiProperty({ description: 'Date de décès (ISO string)' })
  @IsDateString()
  death_date: string;

  @ApiPropertyOptional({ description: 'Cause du décès' })
  @IsOptional()
  @IsString()
  death_cause?: string;

  @ApiPropertyOptional({ description: 'Rapport vétérinaire' })
  @IsOptional()
  @IsString()
  veterinary_report?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

