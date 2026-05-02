import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePeseeDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({ description: "ID de l'animal" })
  @IsString()
  animal_id: string;

  @ApiProperty({ description: 'Date de la pesée (ISO string)' })
  @IsString()
  date: string;

  @ApiProperty({ description: 'Poids en kg' })
  @IsNumber()
  @Min(0.01)
  poids_kg: number;

  @ApiPropertyOptional({ description: 'Commentaire' })
  @IsOptional()
  @IsString()
  commentaire?: string;

  @ApiPropertyOptional({ description: 'Créé par (ID utilisateur)' })
  @IsOptional()
  @IsString()
  cree_par?: string;
}
