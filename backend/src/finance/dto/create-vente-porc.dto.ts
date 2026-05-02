import { IsString, IsNumber, IsOptional, IsEnum, Min, IsArray, ValidateIf, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO pour créer une vente de porc avec validation stricte des sujets vendus
 * Ce DTO est utilisé pour garantir l'intégrité des données du cheptel
 */
export class CreateVentePorcDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  @IsNotEmpty()
  projet_id: string;

  @ApiProperty({ description: 'Montant total de la vente' })
  @IsNumber()
  @Min(0)
  montant: number;

  @ApiProperty({ description: 'Date de la vente (ISO string)' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ description: 'Description de la vente' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Commentaire' })
  @IsOptional()
  @IsString()
  commentaire?: string;

  @ApiPropertyOptional({ description: "Photos (array d'URLs)", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Poids total en kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  poids_kg?: number;

  // ========== IDENTIFICATION DES SUJETS VENDUS (OBLIGATOIRE) ==========

  /**
   * Mode "suivi individuel" : Liste des IDs des animaux vendus
   * OBLIGATOIRE si animal_ids est fourni
   */
  @ApiPropertyOptional({
    description: 'IDs des animaux vendus (mode suivi individuel)',
    type: [String],
  })
  @ValidateIf((o) => !o.batch_id)
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  animal_ids?: string[];

  /**
   * Mode "élevage en bande" : ID de la bande/loge
   * OBLIGATOIRE si batch_id est fourni
   */
  @ApiPropertyOptional({
    description: 'ID de la bande/loge (mode élevage en bande)',
  })
  @ValidateIf((o) => !o.animal_ids || o.animal_ids.length === 0)
  @IsString()
  @IsNotEmpty()
  batch_id?: string;

  /**
   * Mode "élevage en bande" : Quantité de porcs vendus
   * OBLIGATOIRE si batch_id est fourni
   */
  @ApiPropertyOptional({
    description: 'Quantité de porcs vendus (mode élevage en bande)',
  })
  @ValidateIf((o) => o.batch_id)
  @IsNumber()
  @Min(1)
  quantite?: number;
}

