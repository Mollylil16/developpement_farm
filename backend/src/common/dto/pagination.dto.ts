import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO pour la pagination des résultats
 * Utilisé dans les endpoints findAll pour limiter et paginer les résultats
 */
export class PaginationDto {
  /**
   * Nombre d'éléments par page
   * Défaut: 50
   * Maximum: 500
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 50;

  /**
   * Offset pour la pagination (nombre d'éléments à ignorer)
   * Défaut: 0
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

/**
 * Interface pour les réponses paginées
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  totalPages?: number;
}

/**
 * Helper pour créer une réponse paginée
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return {
    data,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
    totalPages,
  };
}

