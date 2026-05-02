import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

/**
 * Statuts possibles pour un rendez-vous
 */
export enum AppointmentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

/**
 * DTO pour mettre à jour un rendez-vous (réponse du vétérinaire)
 */
export class UpdateAppointmentDto {
  @ApiProperty({
    description: 'Nouveau statut du rendez-vous',
    enum: AppointmentStatus,
    example: 'accepted',
  })
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @ApiProperty({
    description: 'Réponse du vétérinaire (optionnel)',
    example: 'Je serai disponible à cette date. Merci de confirmer.',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  vetResponse?: string;
}
