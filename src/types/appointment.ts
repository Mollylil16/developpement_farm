/**
 * Types pour le système de rendez-vous vétérinaires
 */

/**
 * Statuts possibles d'un rendez-vous
 */
export type AppointmentStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

/**
 * Rendez-vous vétérinaire
 */
export interface Appointment {
  id: string;
  producerId: string;
  vetId: string;
  appointmentDate: string; // ISO 8601
  reason: string;
  location?: string;
  status: AppointmentStatus;
  vetResponse?: string;
  vetResponseAt?: string;
  createdAt: string;
  updatedAt: string;
  // Informations supplémentaires
  producerName?: string;
  vetName?: string;
}

/**
 * DTO pour créer une demande de rendez-vous
 */
export interface CreateAppointmentDto {
  vetId: string;
  appointmentDate: string; // ISO 8601
  reason: string;
  location?: string;
}

/**
 * DTO pour mettre à jour un rendez-vous
 */
export interface UpdateAppointmentDto {
  status?: AppointmentStatus;
  vetResponse?: string;
}
