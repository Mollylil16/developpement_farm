import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanificationDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({
    description: 'Type de tâche',
    enum: [
      'saillie',
      'vaccination',
      'sevrage',
      'nettoyage',
      'alimentation',
      'veterinaire',
      'autre',
    ],
  })
  @IsEnum([
    'saillie',
    'vaccination',
    'sevrage',
    'nettoyage',
    'alimentation',
    'veterinaire',
    'autre',
  ])
  type: string;

  @ApiProperty({ description: 'Titre de la tâche' })
  @IsString()
  titre: string;

  @ApiPropertyOptional({ description: 'Description détaillée' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Date prévue (ISO string)' })
  @IsString()
  date_prevue: string;

  @ApiPropertyOptional({ description: "Date d'échéance (ISO string)" })
  @IsOptional()
  @IsString()
  date_echeance?: string;

  @ApiPropertyOptional({ description: 'Date de rappel (ISO string)' })
  @IsOptional()
  @IsString()
  rappel?: string;

  @ApiPropertyOptional({
    description: 'Récurrence',
    enum: ['aucune', 'quotidienne', 'hebdomadaire', 'mensuelle'],
    default: 'aucune',
  })
  @IsOptional()
  @IsEnum(['aucune', 'quotidienne', 'hebdomadaire', 'mensuelle'])
  recurrence?: string;

  @ApiPropertyOptional({ description: 'ID de la gestation liée' })
  @IsOptional()
  @IsString()
  lien_gestation_id?: string;

  @ApiPropertyOptional({ description: 'ID du sevrage lié' })
  @IsOptional()
  @IsString()
  lien_sevrage_id?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
