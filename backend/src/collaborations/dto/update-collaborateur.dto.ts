import { IsString, IsEnum, IsOptional, IsBoolean, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionsDto } from './create-collaborateur.dto';

export class UpdateCollaborateurDto {
  @ApiPropertyOptional({ description: "ID de l'utilisateur lié" })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional({ description: 'Nom du collaborateur' })
  @IsOptional()
  @IsString()
  nom?: string;

  @ApiPropertyOptional({ description: 'Prénom du collaborateur' })
  @IsOptional()
  @IsString()
  prenom?: string;

  @ApiPropertyOptional({ description: 'Email du collaborateur' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Téléphone du collaborateur' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional({ description: 'Rôle du collaborateur' })
  @IsOptional()
  @IsEnum(['proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur'])
  role?: string;

  @ApiPropertyOptional({ description: 'Statut' })
  @IsOptional()
  @IsEnum(['actif', 'en_attente', 'rejete', 'expire', 'suspendu'])
  statut?: string;

  @ApiPropertyOptional({ description: 'Raison du rejet (si statut = rejete)' })
  @IsOptional()
  @IsString()
  rejection_reason?: string;

  @ApiPropertyOptional({ description: 'Raison de la suspension (si statut = suspendu)' })
  @IsOptional()
  @IsString()
  suspension_reason?: string;

  @ApiPropertyOptional({ description: 'Permissions du collaborateur', type: PermissionsDto })
  @IsOptional()
  permissions?: PermissionsDto;

  @ApiPropertyOptional({ description: "Date d'acceptation (ISO string)" })
  @IsOptional()
  @IsString()
  date_acceptation?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
