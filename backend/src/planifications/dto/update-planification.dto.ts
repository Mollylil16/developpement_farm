import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlanificationDto {
  @ApiPropertyOptional({ description: 'Type de tâche' })
  @IsOptional()
  @IsEnum([
    'saillie',
    'vaccination',
    'sevrage',
    'nettoyage',
    'alimentation',
    'veterinaire',
    'autre',
  ])
  type?: string;

  @ApiPropertyOptional({ description: 'Titre de la tâche' })
  @IsOptional()
  @IsString()
  titre?: string;

  @ApiPropertyOptional({ description: 'Description détaillée' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Date prévue (ISO string)' })
  @IsOptional()
  @IsString()
  date_prevue?: string;

  @ApiPropertyOptional({ description: "Date d'échéance (ISO string)" })
  @IsOptional()
  @IsString()
  date_echeance?: string;

  @ApiPropertyOptional({ description: 'Date de rappel (ISO string)' })
  @IsOptional()
  @IsString()
  rappel?: string;

  @ApiPropertyOptional({
    description: 'Statut',
    enum: ['a_faire', 'en_cours', 'terminee', 'annulee'],
  })
  @IsOptional()
  @IsEnum(['a_faire', 'en_cours', 'terminee', 'annulee'])
  statut?: string;

  @ApiPropertyOptional({ description: 'Récurrence' })
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
