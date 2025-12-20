import { IsString, IsEnum, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCalendrierVaccinationDto {
  @ApiPropertyOptional({ description: 'Type de vaccin' })
  @IsOptional()
  @IsEnum(['rouget', 'parvovirose', 'mal_rouge', 'circovirus', 'mycoplasme', 'grippe', 'autre'])
  vaccin?: string;

  @ApiPropertyOptional({ description: 'Nom du vaccin' })
  @IsOptional()
  @IsString()
  nom_vaccin?: string;

  @ApiPropertyOptional({ description: "Catégorie d'animal" })
  @IsOptional()
  @IsEnum(['porcelet', 'truie', 'verrat', 'porc_croissance', 'tous'])
  categorie?: string;

  @ApiPropertyOptional({ description: 'Âge recommandé en jours' })
  @IsOptional()
  @IsInt()
  @Min(0)
  age_jours?: number;

  @ApiPropertyOptional({ description: 'Date planifiée (ISO string)' })
  @IsOptional()
  @IsString()
  date_planifiee?: string;

  @ApiPropertyOptional({ description: 'Fréquence de rappel en jours' })
  @IsOptional()
  @IsInt()
  @Min(0)
  frequence_jours?: number;

  @ApiPropertyOptional({ description: 'Vaccination obligatoire' })
  @IsOptional()
  @IsBoolean()
  obligatoire?: boolean;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
