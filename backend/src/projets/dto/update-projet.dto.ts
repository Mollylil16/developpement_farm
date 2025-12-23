import { IsString, IsNumber, IsOptional, IsInt, Min, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjetDto {
  @ApiPropertyOptional({ description: 'Nom du projet' })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional({ description: 'Localisation' })
  @IsOptional()
  @IsString()
  localisation?: string;

  @ApiPropertyOptional({ description: 'Nombre de truies' })
  @IsOptional()
  @IsInt()
  @Min(0)
  nombre_truies?: number;

  @ApiPropertyOptional({ description: 'Nombre de verrats' })
  @IsOptional()
  @IsInt()
  @Min(0)
  nombre_verrats?: number;

  @ApiPropertyOptional({ description: 'Nombre de porcelets' })
  @IsOptional()
  @IsInt()
  @Min(0)
  nombre_porcelets?: number;

  @ApiPropertyOptional({ description: 'Nombre de porcs en croissance' })
  @IsOptional()
  @IsInt()
  @Min(0)
  nombre_croissance?: number;

  @ApiPropertyOptional({ description: 'Poids moyen actuel (kg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  poids_moyen_actuel?: number;

  @ApiPropertyOptional({ description: 'Âge moyen actuel (jours)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  age_moyen_actuel?: number;

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

  @ApiPropertyOptional({ description: 'Statut du projet', enum: ['actif', 'archive', 'suspendu'] })
  @IsOptional()
  @IsIn(['actif', 'archive', 'suspendu'])
  statut?: 'actif' | 'archive' | 'suspendu';

  @ApiPropertyOptional({ description: "Durée d'amortissement par défaut (mois)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  duree_amortissement_par_defaut_mois?: number;

  @ApiPropertyOptional({ 
    description: "Méthode de gestion d'élevage",
    enum: ['individual', 'batch']
  })
  @IsOptional()
  @IsIn(['individual', 'batch'])
  management_method?: 'individual' | 'batch';
}
