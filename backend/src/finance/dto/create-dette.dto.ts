import { IsString, IsNumber, IsOptional, IsDateString, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDetteDto {
  @ApiProperty({ description: 'ID du projet' })
  @IsString()
  projet_id: string;

  @ApiProperty({ description: 'Libellé de la dette' })
  @IsString()
  libelle: string;

  @ApiProperty({
    description: 'Type de dette',
    enum: ['pret_bancaire', 'pret_personnel', 'fournisseur', 'autre'],
  })
  @IsEnum(['pret_bancaire', 'pret_personnel', 'fournisseur', 'autre'])
  type_dette: 'pret_bancaire' | 'pret_personnel' | 'fournisseur' | 'autre';

  @ApiProperty({ description: 'Montant initial de la dette' })
  @IsNumber()
  @Min(0)
  montant_initial: number;

  @ApiProperty({ description: 'Montant restant à rembourser' })
  @IsNumber()
  @Min(0)
  montant_restant: number;

  @ApiPropertyOptional({ description: 'Taux d\'intérêt annuel en pourcentage', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  taux_interet?: number;

  @ApiProperty({ description: 'Date de début du prêt' })
  @IsDateString()
  date_debut: string;

  @ApiPropertyOptional({ description: 'Date d\'échéance' })
  @IsDateString()
  @IsOptional()
  date_echeance?: string;

  @ApiPropertyOptional({
    description: 'Fréquence de remboursement',
    enum: ['mensuel', 'trimestriel', 'annuel', 'ponctuel'],
    default: 'mensuel',
  })
  @IsEnum(['mensuel', 'trimestriel', 'annuel', 'ponctuel'])
  @IsOptional()
  frequence_remboursement?: 'mensuel' | 'trimestriel' | 'annuel' | 'ponctuel';

  @ApiPropertyOptional({ description: 'Montant de remboursement par période' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  montant_remboursement?: number;

  @ApiPropertyOptional({
    description: 'Statut de la dette',
    enum: ['en_cours', 'rembourse', 'en_defaut', 'annule'],
    default: 'en_cours',
  })
  @IsEnum(['en_cours', 'rembourse', 'en_defaut', 'annule'])
  @IsOptional()
  statut?: 'en_cours' | 'rembourse' | 'en_defaut' | 'annule';

  @ApiPropertyOptional({ description: 'Nom du prêteur' })
  @IsString()
  @IsOptional()
  preteur?: string;

  @ApiPropertyOptional({ description: 'Notes supplémentaires' })
  @IsString()
  @IsOptional()
  notes?: string;
}

