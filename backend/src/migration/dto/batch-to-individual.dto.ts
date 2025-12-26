import { IsString, IsBoolean, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DistributionMethod {
  UNIFORM = 'uniform',
  NORMAL = 'normal',
  MANUAL = 'manual',
}

export enum HealthRecordsHandling {
  DUPLICATE = 'duplicate',
  GENERIC = 'generic',
  SKIP = 'skip',
}

export enum FeedRecordsHandling {
  DIVIDE = 'divide',
  SKIP = 'skip',
}

export class BatchToIndividualOptionsDto {
  @ApiProperty({ description: 'Auto-générer les numéros d\'identification' })
  @IsBoolean()
  generateIds: boolean;

  @ApiPropertyOptional({ description: 'Pattern pour la génération d\'IDs (ex: "{building}-{batch}-{seq:3}")' })
  @IsOptional()
  @IsString()
  idPattern?: string;

  @ApiProperty({ description: 'Méthode de distribution des poids', enum: DistributionMethod })
  @IsEnum(DistributionMethod)
  distributionMethod: DistributionMethod;

  @ApiPropertyOptional({ description: 'Ratio mâles/femelles (ex: {male: 0.5, female: 0.5})' })
  @IsOptional()
  sexRatio?: {
    male: number;
    female: number;
  };

  @ApiProperty({ description: 'Conserver la référence à la bande d\'origine' })
  @IsBoolean()
  preserveBatchReference: boolean;

  @ApiProperty({ description: 'Gestion des enregistrements de santé', enum: HealthRecordsHandling })
  @IsEnum(HealthRecordsHandling)
  handleHealthRecords: HealthRecordsHandling;

  @ApiProperty({ description: 'Gestion des enregistrements d\'alimentation', enum: FeedRecordsHandling })
  @IsEnum(FeedRecordsHandling)
  handleFeedRecords: FeedRecordsHandling;

  @ApiProperty({ description: 'Créer des pesées initiales' })
  @IsBoolean()
  createWeightRecords: boolean;

  @ApiPropertyOptional({ description: 'Écart-type pour distribution normale (en % du poids moyen)', minimum: 1, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  weightStdDevPercent?: number;
}

export class BatchToIndividualDto {
  @ApiProperty({ description: 'ID de la bande à convertir' })
  @IsString()
  batchId: string;

  @ApiProperty({ description: 'Options de migration', type: BatchToIndividualOptionsDto })
  options: BatchToIndividualOptionsDto;
}

