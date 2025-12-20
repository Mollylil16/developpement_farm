import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStockMouvementDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({ description: "ID de l'aliment" })
  @IsString()
  aliment_id: string;

  @ApiProperty({ description: 'Type de mouvement', enum: ['entree', 'sortie', 'ajustement'] })
  @IsEnum(['entree', 'sortie', 'ajustement'])
  type: string;

  @ApiProperty({ description: 'Quantité' })
  @IsNumber()
  @Min(0.01)
  quantite: number;

  @ApiProperty({ description: 'Unité de mesure', enum: ['kg', 'g', 'l', 'ml', 'sac', 'unite'] })
  @IsEnum(['kg', 'g', 'l', 'ml', 'sac', 'unite'])
  unite: string;

  @ApiProperty({ description: 'Date du mouvement (ISO string)' })
  @IsString()
  date: string;

  @ApiPropertyOptional({ description: 'Origine du mouvement' })
  @IsOptional()
  @IsString()
  origine?: string;

  @ApiPropertyOptional({ description: 'Commentaire' })
  @IsOptional()
  @IsString()
  commentaire?: string;

  @ApiPropertyOptional({ description: "ID de l'utilisateur ayant créé le mouvement" })
  @IsOptional()
  @IsString()
  cree_par?: string;
}
