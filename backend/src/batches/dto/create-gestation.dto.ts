import { IsString, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiExtraModels } from '@nestjs/swagger';

@ApiExtraModels()
export class CreateBatchGestationDto {
  @ApiProperty({ description: 'ID de la bande' })
  @IsString()
  batch_id: string;

  @ApiProperty({ description: 'Date de sautage (ISO string)' })
  @IsDateString()
  mating_date: string;

  @ApiPropertyOptional({ description: 'ID du verrat utilisé' })
  @IsOptional()
  @IsString()
  verrat_id?: string;

  @ApiPropertyOptional({ description: 'Nom du verrat' })
  @IsOptional()
  @IsString()
  verrat_nom?: string;

  @ApiPropertyOptional({ description: 'Nombre de porcelets prévu', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  piglets_expected?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiExtraModels()
export class UpdateBatchGestationDto {
  @ApiPropertyOptional({ description: 'Date de mise bas réelle (ISO string)' })
  @IsOptional()
  @IsDateString()
  actual_delivery_date?: string;

  @ApiPropertyOptional({ description: 'Nombre de porcelets nés' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  piglets_born_count?: number;

  @ApiPropertyOptional({ description: 'Nombre de porcelets vivants' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  piglets_alive_count?: number;

  @ApiPropertyOptional({ description: 'Nombre de porcelets morts' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  piglets_dead_count?: number;

  @ApiPropertyOptional({
    description: 'Statut',
    enum: ['pregnant', 'delivered', 'aborted', 'lost'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

