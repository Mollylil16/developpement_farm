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

class IngredientBudgetDto {
  @ApiProperty({ description: "Nom de l'ingrédient" })
  @IsString()
  nom: string;

  @ApiProperty({ description: 'Pourcentage dans la formule (0-100)' })
  @IsNumber()
  @Min(0)
  pourcentage: number;

  @ApiProperty({ description: 'Quantité en kg' })
  @IsNumber()
  @Min(0)
  quantite_kg: number;

  @ApiProperty({ description: 'Prix unitaire' })
  @IsNumber()
  @Min(0)
  prix_unitaire: number;

  @ApiProperty({ description: 'Coût total' })
  @IsNumber()
  @Min(0)
  cout_total: number;
}

export class CreateRationBudgetDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({ description: 'Nom du budget' })
  @IsString()
  nom: string;

  @ApiProperty({
    description: 'Type de porc',
    enum: ['porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance'],
  })
  @IsEnum(['porcelet', 'truie_gestante', 'truie_allaitante', 'verrat', 'porc_croissance'])
  type_porc: string;

  @ApiProperty({ description: 'Poids moyen en kg' })
  @IsNumber()
  @Min(0.01)
  poids_moyen_kg: number;

  @ApiProperty({ description: 'Nombre de porcs' })
  @IsNumber()
  @Min(1)
  nombre_porcs: number;

  @ApiProperty({ description: 'Durée en jours' })
  @IsNumber()
  @Min(1)
  duree_jours: number;

  @ApiProperty({ description: 'Ration journalière par porc en kg' })
  @IsNumber()
  @Min(0.01)
  ration_journaliere_par_porc: number;

  @ApiProperty({ description: 'Quantité totale en kg' })
  @IsNumber()
  @Min(0)
  quantite_totale_kg: number;

  @ApiProperty({ description: 'Coût total' })
  @IsNumber()
  @Min(0)
  cout_total: number;

  @ApiProperty({ description: 'Coût par kg' })
  @IsNumber()
  @Min(0)
  cout_par_kg: number;

  @ApiProperty({ description: 'Coût par porc' })
  @IsNumber()
  @Min(0)
  cout_par_porc: number;

  @ApiProperty({ description: 'Liste des ingrédients', type: [IngredientBudgetDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientBudgetDto)
  ingredients: IngredientBudgetDto[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
