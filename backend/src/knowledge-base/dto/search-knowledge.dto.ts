import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchKnowledgeDto {
  @ApiProperty({ description: 'Requête de recherche' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Filtrer par catégorie' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'ID du projet pour contenu spécifique' })
  @IsOptional()
  @IsString()
  projet_id?: string;

  @ApiPropertyOptional({ description: 'Limite de résultats', default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;
}

