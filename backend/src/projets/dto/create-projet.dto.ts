import { IsString, IsNumber, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjetDto {
  @ApiProperty({ description: 'Nom du projet (ferme)' })
  @IsString()
  nom: string;

  @ApiProperty({ description: 'Localisation de la ferme' })
  @IsString()
  localisation: string;

  @ApiProperty({ description: 'Nombre de truies' })
  @IsInt()
  @Min(0)
  nombre_truies: number;

  @ApiProperty({ description: 'Nombre de verrats' })
  @IsInt()
  @Min(0)
  nombre_verrats: number;

  @ApiProperty({ description: 'Nombre de porcelets' })
  @IsInt()
  @Min(0)
  nombre_porcelets: number;

  @ApiPropertyOptional({ description: 'Nombre de porcs en croissance', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  nombre_croissance?: number;

  @ApiProperty({ description: 'Poids moyen actuel (kg)' })
  @IsNumber()
  @Min(0)
  poids_moyen_actuel: number;

  @ApiProperty({ description: 'Âge moyen actuel (jours)' })
  @IsInt()
  @Min(0)
  age_moyen_actuel: number;

  @ApiPropertyOptional({ description: 'Prix au kg poids vif' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prix_kg_vif?: number;

  @ApiPropertyOptional({ description: 'Prix au kg carcasse' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prix_kg_carcasse?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Durée d'amortissement par défaut (mois)", default: 36 })
  @IsOptional()
  @IsInt()
  @Min(1)
  duree_amortissement_par_defaut_mois?: number;

  @ApiPropertyOptional({ 
    description: "Méthode de gestion d'élevage : individual (suivi individuel) ou batch (suivi par bande)",
    enum: ['individual', 'batch'],
    default: 'individual'
  })
  @IsOptional()
  @IsString()
  management_method?: 'individual' | 'batch';
}
