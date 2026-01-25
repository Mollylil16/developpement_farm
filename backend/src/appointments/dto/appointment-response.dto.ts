import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de réponse pour un rendez-vous
 */
export class AppointmentResponseDto {
  @ApiProperty({ description: 'ID du rendez-vous' })
  id: string;

  @ApiProperty({ description: 'ID du producteur' })
  producerId: string;

  @ApiProperty({ description: 'ID du vétérinaire' })
  vetId: string;

  @ApiProperty({ description: 'Date et heure du rendez-vous' })
  appointmentDate: string;

  @ApiProperty({ description: 'Raison du rendez-vous' })
  reason: string;

  @ApiProperty({ description: 'Lieu d\'intervention', required: false })
  location?: string;

  @ApiProperty({ description: 'Statut du rendez-vous' })
  status: string;

  @ApiProperty({ description: 'Réponse du vétérinaire', required: false })
  vetResponse?: string;

  @ApiProperty({ description: 'Date de réponse du vétérinaire', required: false })
  vetResponseAt?: string;

  @ApiProperty({ description: 'Date de création' })
  createdAt: string;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt: string;

  // Informations supplémentaires (optionnel)
  @ApiProperty({ description: 'Nom du producteur', required: false })
  producerName?: string;

  @ApiProperty({ description: 'Nom du vétérinaire', required: false })
  vetName?: string;
}
