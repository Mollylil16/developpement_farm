import { IsString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMortaliteDto {
  @ApiPropertyOptional({ description: 'Nombre de porcs morts' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  nombre_porcs?: number;

  @ApiPropertyOptional({ description: 'Date de la mortalité (ISO string)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Cause de la mortalité' })
  @IsOptional()
  @IsString()
  cause?: string;

  @ApiPropertyOptional({ description: 'Catégorie' })
  @IsOptional()
  @IsEnum(['porcelet', 'truie', 'verrat', 'autre'])
  categorie?: string;

  @ApiPropertyOptional({ description: "Code de l'animal mort" })
  @IsOptional()
  @IsString()
  animal_code?: string;

  @ApiPropertyOptional({
    description: 'ID de la bande associée à la mortalité (mode batch)',
  })
  @IsOptional()
  @IsString()
  batch_id?: string;

  @ApiPropertyOptional({ description: 'Poids en kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  poids_kg?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
