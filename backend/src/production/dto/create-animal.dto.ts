import { IsString, IsNumber, IsOptional, IsBoolean, IsIn, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnimalDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({ description: "Code de l'animal" })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: "Nom de l'animal" })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional({ description: "Origine de l'animal" })
  @IsOptional()
  @IsString()
  origine?: string;

  @ApiPropertyOptional({
    description: "Sexe de l'animal",
    enum: ['male', 'femelle', 'indetermine'],
    default: 'indetermine',
  })
  @IsOptional()
  @IsIn(['male', 'femelle', 'indetermine'])
  sexe?: 'male' | 'femelle' | 'indetermine';

  @ApiPropertyOptional({ description: 'Date de naissance (ISO string)' })
  @IsOptional()
  @IsString()
  date_naissance?: string;

  @ApiPropertyOptional({ description: 'Poids initial (kg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  poids_initial?: number;

  @ApiPropertyOptional({ description: "Date d'entrée (ISO string)" })
  @IsOptional()
  @IsString()
  date_entree?: string;

  @ApiPropertyOptional({
    description: "Statut de l'animal",
    enum: ['actif', 'mort', 'vendu', 'offert', 'autre'],
    default: 'actif',
  })
  @IsOptional()
  @IsIn(['actif', 'mort', 'vendu', 'offert', 'autre'])
  statut?: 'actif' | 'mort' | 'vendu' | 'offert' | 'autre';

  @ApiPropertyOptional({ description: 'Race' })
  @IsOptional()
  @IsString()
  race?: string;

  @ApiPropertyOptional({ description: 'Est reproducteur', default: false })
  @IsOptional()
  @IsBoolean()
  reproducteur?: boolean;

  @ApiPropertyOptional({
    description: 'Catégorie de poids',
    enum: ['porcelet', 'croissance', 'finition'],
  })
  @IsOptional()
  @IsIn(['porcelet', 'croissance', 'finition'])
  categorie_poids?: 'porcelet' | 'croissance' | 'finition';

  @ApiPropertyOptional({ description: 'ID du père' })
  @IsOptional()
  @IsString()
  pere_id?: string;

  @ApiPropertyOptional({ description: 'ID de la mère' })
  @IsOptional()
  @IsString()
  mere_id?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'URI de la photo' })
  @IsOptional()
  @IsString()
  photo_uri?: string;
}
