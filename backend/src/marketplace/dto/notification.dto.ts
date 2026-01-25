import { IsString, IsBoolean, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsActionUrl } from './validators/action-url.validator';

export enum NotificationType {
  NEW_OFFER = 'new_offer',           // ✅ Nouvelle offre reçue par le producteur
  OFFER_RECEIVED = 'offer_received',
  OFFER_ACCEPTED = 'offer_accepted',
  OFFER_REJECTED = 'offer_rejected',
  OFFER_COUNTERED = 'offer_countered',
  OFFER_WITHDRAWN = 'offer_withdrawn',
  MESSAGE_RECEIVED = 'message_received',
  LISTING_SOLD = 'listing_sold',
  LISTING_EXPIRED = 'listing_expired',
  // ✅ Notifications enrichies avec détails de contact et localisation
  SALE_CONFIRMED_BUYER = 'sale_confirmed_buyer',     // Pour l'acheteur avec détails ferme
  SALE_CONFIRMED_PRODUCER = 'sale_confirmed_producer', // Pour le producteur avec détails acheteur
  // ✅ Notifications pour les rendez-vous vétérinaires
  APPOINTMENT_REQUESTED = 'appointment_requested',   // Demande de RDV reçue (vétérinaire)
  APPOINTMENT_ACCEPTED = 'appointment_accepted',      // RDV accepté (producteur)
  APPOINTMENT_REJECTED = 'appointment_rejected',     // RDV refusé (producteur)
  APPOINTMENT_CANCELLED = 'appointment_cancelled',   // RDV annulé (les deux)
  APPOINTMENT_REMINDER = 'appointment_reminder',     // Rappel RDV (les deux)
}

export class CreateNotificationDto {
  @ApiProperty({ description: 'ID de l\'utilisateur destinataire', example: 'user_123' })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Type de notification',
    enum: NotificationType,
    example: NotificationType.OFFER_RECEIVED
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Titre de la notification', example: 'Nouvelle offre reçue' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Message de la notification', example: 'Vous avez reçu une offre de 1500 FCFA' })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Type d\'entité liée',
    example: 'offer'
  })
  @IsString()
  @IsOptional()
  relatedType?: string;

  @ApiPropertyOptional({
    description: 'ID de l\'entité liée',
    example: 'offer_123'
  })
  @IsString()
  @IsOptional()
  relatedId?: string;

  @ApiPropertyOptional({
    description: 'URL d\'action pour rediriger l\'utilisateur (chemin relatif sécurisé)',
    example: '/marketplace/offers/offer_123'
  })
  @IsActionUrl()
  @IsOptional()
  actionUrl?: string;

  @ApiPropertyOptional({
    description: 'Données enrichies (contact, localisation, détails transaction)',
    example: { producer: { name: 'Jean', phone: '+225 07 xx xx xx' } }
  })
  @IsOptional()
  data?: Record<string, any>;
}

export class MarkAsReadDto {
  @ApiProperty({
    description: 'IDs des notifications à marquer comme lues',
    type: [String],
    example: ['notif_123', 'notif_456']
  })
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];
}

export class NotificationResponseDto {
  @ApiProperty({ description: 'ID de la notification' })
  id: string;

  @ApiProperty({ description: 'ID de l\'utilisateur' })
  userId: string;

  @ApiProperty({ description: 'Type de notification', enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ description: 'Titre' })
  title: string;

  @ApiProperty({ description: 'Message' })
  message: string;

  @ApiPropertyOptional({ description: 'Type d\'entité liée' })
  relatedType?: string;

  @ApiPropertyOptional({ description: 'ID d\'entité liée' })
  relatedId?: string;

  @ApiPropertyOptional({ description: 'URL d\'action' })
  actionUrl?: string;

  @ApiProperty({ description: 'Lu ou non' })
  read: boolean;

  @ApiPropertyOptional({ description: 'Date de lecture' })
  readAt?: string;

  @ApiProperty({ description: 'Date de création' })
  createdAt: string;
}
