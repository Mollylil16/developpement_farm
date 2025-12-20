import { IsString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMortaliteDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({ description: 'Nombre de porcs morts', example: 1 })
  @IsNumber()
  @Min(1)
  nombre_porcs: number;

  @ApiProperty({ description: 'Date de la mortalité (ISO string)' })
  @IsString()
  date: string;

  @ApiPropertyOptional({ description: 'Cause de la mortalité' })
  @IsOptional()
  @IsString()
  cause?: string;

  @ApiProperty({ description: 'Catégorie', enum: ['porcelet', 'truie', 'verrat', 'autre'] })
  @IsEnum(['porcelet', 'truie', 'verrat', 'autre'])
  categorie: string;

  @ApiPropertyOptional({ description: "Code de l'animal mort (si enregistré)" })
  @IsOptional()
  @IsString()
  animal_code?: string;

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
