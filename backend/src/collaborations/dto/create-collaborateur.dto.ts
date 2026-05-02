import { IsString, IsEnum, IsOptional, IsBoolean, IsEmail, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionsDto {
  @ApiPropertyOptional({ description: 'Permission reproduction', default: false })
  @IsOptional()
  @IsBoolean()
  reproduction?: boolean;

  @ApiPropertyOptional({ description: 'Permission nutrition', default: false })
  @IsOptional()
  @IsBoolean()
  nutrition?: boolean;

  @ApiPropertyOptional({ description: 'Permission finance', default: false })
  @IsOptional()
  @IsBoolean()
  finance?: boolean;

  @ApiPropertyOptional({ description: 'Permission rapports', default: false })
  @IsOptional()
  @IsBoolean()
  rapports?: boolean;

  @ApiPropertyOptional({ description: 'Permission planification', default: false })
  @IsOptional()
  @IsBoolean()
  planification?: boolean;

  @ApiPropertyOptional({ description: 'Permission mortalités', default: false })
  @IsOptional()
  @IsBoolean()
  mortalites?: boolean;

  @ApiPropertyOptional({ description: 'Permission santé', default: false })
  @IsOptional()
  @IsBoolean()
  sante?: boolean;
}

export class CreateCollaborateurDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiPropertyOptional({ description: "ID de l'utilisateur lié (optionnel)" })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiProperty({ description: 'Nom du collaborateur' })
  @IsString()
  nom: string;

  @ApiProperty({ description: 'Prénom du collaborateur' })
  @IsString()
  prenom: string;

  @ApiPropertyOptional({ 
    description: 'Email du collaborateur (requis si telephone non fourni)' 
  })
  @ValidateIf((o) => !o.telephone || o.telephone.trim().length === 0)
  @IsEmail({}, { message: 'Format d\'email invalide' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ 
    description: 'Téléphone du collaborateur (requis si email non fourni)' 
  })
  @ValidateIf((o) => !o.email || o.email.trim().length === 0)
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiProperty({
    description: 'Rôle du collaborateur',
    enum: ['proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur'],
  })
  @IsEnum(['proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur'])
  role: string;

  @ApiPropertyOptional({
    description: 'Statut',
    enum: ['actif', 'inactif', 'en_attente'],
    default: 'en_attente',
  })
  @IsOptional()
  @IsEnum(['actif', 'inactif', 'en_attente'])
  statut?: string;

  @ApiPropertyOptional({ description: 'Permissions du collaborateur', type: PermissionsDto })
  @IsOptional()
  permissions?: PermissionsDto;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
