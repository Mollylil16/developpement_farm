import { IsString, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDiseaseDto {
  @ApiProperty({ description: 'ID de la bande' })
  @IsString()
  batch_id: string;

  @ApiProperty({ description: 'Nom de la maladie' })
  @IsString()
  disease_name: string;

  @ApiPropertyOptional({ description: 'Symptômes' })
  @IsOptional()
  @IsString()
  symptoms?: string;

  @ApiProperty({ description: 'Date de diagnostic (ISO string)' })
  @IsDateString()
  diagnosis_date: string;

  @ApiPropertyOptional({ description: 'Description du traitement' })
  @IsOptional()
  @IsString()
  treatment_description?: string;

  @ApiPropertyOptional({ description: 'Date de début du traitement (ISO string)' })
  @IsOptional()
  @IsDateString()
  treatment_start_date?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDiseaseDto {
  @ApiPropertyOptional({ description: 'Date de guérison (ISO string)' })
  @IsOptional()
  @IsDateString()
  recovery_date?: string;

  @ApiPropertyOptional({
    description: 'Statut',
    enum: ['sick', 'treatment', 'recovered', 'dead'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Date de fin du traitement (ISO string)' })
  @IsOptional()
  @IsDateString()
  treatment_end_date?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

