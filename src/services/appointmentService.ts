/**
 * Service pour gérer les rendez-vous vétérinaires
 */

import apiClient from './api/apiClient';
import type { Appointment, CreateAppointmentDto, UpdateAppointmentDto } from '../types/appointment';

/**
 * Créer une demande de rendez-vous
 */
export async function createAppointment(dto: CreateAppointmentDto): Promise<Appointment> {
  return apiClient.post<Appointment>('/appointments', dto);
}

/**
 * Récupérer tous les rendez-vous d'un utilisateur
 */
export async function getAppointments(role: 'producer' | 'veterinarian'): Promise<Appointment[]> {
  return apiClient.get<Appointment[]>('/appointments', {
    params: { role },
  });
}

/**
 * Récupérer les rendez-vous à venir
 */
export async function getUpcomingAppointments(
  role: 'producer' | 'veterinarian',
): Promise<Appointment[]> {
  return apiClient.get<Appointment[]>('/appointments/upcoming', {
    params: { role },
  });
}

/**
 * Récupérer un rendez-vous par ID
 */
export async function getAppointmentById(appointmentId: string): Promise<Appointment> {
  return apiClient.get<Appointment>(`/appointments/${appointmentId}`);
}

/**
 * Mettre à jour un rendez-vous (réponse du vétérinaire)
 */
export async function updateAppointment(
  appointmentId: string,
  dto: UpdateAppointmentDto,
): Promise<Appointment> {
  return apiClient.patch<Appointment>(`/appointments/${appointmentId}`, dto);
}

/**
 * Annuler un rendez-vous
 */
export async function cancelAppointment(appointmentId: string): Promise<Appointment> {
  return apiClient.delete<Appointment>(`/appointments/${appointmentId}/cancel`);
}
