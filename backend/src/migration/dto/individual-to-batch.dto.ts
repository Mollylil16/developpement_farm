import { IsString, IsBoolean, IsOptional, IsNumber, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GroupingCriteriaDto {
  @ApiProperty({ description: 'Regrouper par stade de production' })
  @IsBoolean()
  byStage: boolean;

  @ApiProperty({ description: 'Regrouper par localisation' })
  @IsBoolean()
  byLocation: boolean;

  @ApiProperty({ description: 'Regrouper par sexe' })
  @IsBoolean()
  bySex: boolean;

  @ApiProperty({ description: 'Regrouper par race' })
  @IsBoolean()
  byBreed: boolean;

  @ApiPropertyOptional({ description: 'Tolérance d\'âge en jours pour regroupement', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ageToleranceDays?: number;
}

export class IndividualToBatchOptionsDto {
  @ApiProperty({ description: 'Critères de regroupement', type: GroupingCriteriaDto })
  groupingCriteria: GroupingCriteriaDto;

  @ApiPropertyOptional({ description: 'Pattern pour numéro de bande (ex: "B{year}{seq:3}")' })
  @IsOptional()
  @IsString()
  batchNumberPattern?: string;

  @ApiProperty({ description: 'Agréger les enregistrements de santé' })
  @IsBoolean()
  aggregateHealthRecords: boolean;

  @ApiProperty({ description: 'Agréger les enregistrements d\'alimentation' })
  @IsBoolean()
  aggregateFeedRecords: boolean;

  @ApiProperty({ description: 'Conserver les enregistrements individuels en plus' })
  @IsBoolean()
  keepIndividualRecords: boolean;

  @ApiPropertyOptional({ description: 'Taille minimale de bande', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minimumBatchSize?: number;
}

export class IndividualToBatchDto {
  @ApiProperty({ description: 'IDs des animaux à regrouper', type: [String] })
  @IsArray()
  @IsString({ each: true })
  pigIds: string[];

  @ApiProperty({ description: 'Options de migration', type: IndividualToBatchOptionsDto })
  options: IndividualToBatchOptionsDto;
}

