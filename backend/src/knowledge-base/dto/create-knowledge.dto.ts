import { IsString, IsOptional, IsArray, IsNumber, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateKnowledgeDto {
  @ApiProperty({ 
    description: 'Catégorie du contenu',
    enum: ['types_elevage', 'objectifs', 'races', 'emplacement', 'eau', 'alimentation', 'sante', 'finance', 'commerce', 'reglementation', 'general']
  })
  @IsString()
  @IsIn(['types_elevage', 'objectifs', 'races', 'emplacement', 'eau', 'alimentation', 'sante', 'finance', 'commerce', 'reglementation', 'general'])
  category: string;

  @ApiProperty({ description: 'Titre du sujet' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Mots-clés pour la recherche' })
  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @ApiProperty({ description: 'Contenu formaté (markdown supporté)' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Résumé court' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Niveau de priorité (1-10)', default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({ description: 'Visibilité', enum: ['global', 'projet'], default: 'global' })
  @IsOptional()
  @IsString()
  @IsIn(['global', 'projet'])
  visibility?: string;

  @ApiPropertyOptional({ description: 'ID du projet (si visibility = projet)' })
  @IsOptional()
  @IsString()
  projet_id?: string;
}

export class UpdateKnowledgeDto {
  @ApiPropertyOptional({ description: 'Catégorie du contenu' })
  @IsOptional()
  @IsString()
  @IsIn(['types_elevage', 'objectifs', 'races', 'emplacement', 'eau', 'alimentation', 'sante', 'finance', 'commerce', 'reglementation', 'general'])
  category?: string;

  @ApiPropertyOptional({ description: 'Titre du sujet' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Mots-clés pour la recherche' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Contenu formaté' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Résumé court' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Niveau de priorité (1-10)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({ description: 'Actif ou non' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

