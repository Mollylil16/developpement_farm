import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class IngredientRationDto {
  @ApiProperty({ description: "ID de l'ingrédient" })
  @IsString()
  ingredient_id: string;

  @ApiProperty({ description: 'Quantité nécessaire' })
  @IsNumber()
  @Min(0.01)
  quantite: number;
}

export class CreateRationDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({
    description: 'Type de porc',
    enum: ['porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance'],
  })
  @IsEnum(['porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance'])
  type_porc: string;

  @ApiProperty({ description: 'Poids en kg' })
  @IsNumber()
  @Min(0.01)
  poids_kg: number;

  @ApiPropertyOptional({ description: 'Nombre de porcs' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  nombre_porcs?: number;

  @ApiProperty({ description: 'Liste des ingrédients avec quantités', type: [IngredientRationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientRationDto)
  ingredients: IngredientRationDto[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
