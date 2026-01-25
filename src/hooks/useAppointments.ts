/**
 * Hook pour gérer les rendez-vous vétérinaires
 */

import { useState, useEffect, useCallback } from 'react';
import { useRole } from '../contexts/RoleContext';
import {
  getAppointments,
  getUpcomingAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
} from '../services/appointmentService';
import type { Appointment, CreateAppointmentDto, UpdateAppointmentDto } from '../types/appointment';
import { logger } from '../utils/logger';

interface UseAppointmentsReturn {
  appointments: Appointment[];
  upcomingAppointments: Appointment[];
  loading: boolean;
  error: string | null;
  create: (dto: CreateAppointmentDto) => Promise<Appointment>;
  update: (id: string, dto: UpdateAppointmentDto) => Promise<Appointment>;
  cancel: (id: string) => Promise<Appointment>;
  refresh: () => Promise<void>;
}

/**
 * Hook pour gérer les rendez-vous selon le rôle de l'utilisateur
 */
export function useAppointments(): UseAppointmentsReturn {
  const { currentUser } = useRole();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Déterminer le rôle de l'utilisateur
  const userRole = currentUser?.roles?.producer
    ? 'producer'
    : currentUser?.roles?.veterinarian
    ? 'veterinarian'
    : null;

  /**
   * Charger les rendez-vous
   */
  const loadAppointments = useCallback(async () => {
    if (!userRole) {
      setAppointments([]);
      setUpcomingAppointments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [allAppointments, upcoming] = await Promise.all([
        getAppointments(userRole),
        getUpcomingAppointments(userRole),
      ]);

      setAppointments(allAppointments);
      setUpcomingAppointments(upcoming);
    } catch (err: any) {
      logger.error('Erreur lors du chargement des rendez-vous:', err);
      setError(err.message || 'Erreur lors du chargement des rendez-vous');
      setAppointments([]);
      setUpcomingAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  /**
   * Créer un rendez-vous
   */
  const create = useCallback(
    async (dto: CreateAppointmentDto): Promise<Appointment> => {
      if (!userRole || userRole !== 'producer') {
        throw new Error('Seuls les producteurs peuvent créer des rendez-vous');
      }

      setLoading(true);
      setError(null);

      try {
        const newAppointment = await createAppointment(dto);
        // Recharger la liste
        await loadAppointments();
        return newAppointment;
      } catch (err: any) {
        logger.error('Erreur lors de la création du rendez-vous:', err);
        setError(err.message || 'Erreur lors de la création du rendez-vous');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [userRole, loadAppointments],
  );

  /**
   * Mettre à jour un rendez-vous
   */
  const update = useCallback(
    async (id: string, dto: UpdateAppointmentDto): Promise<Appointment> => {
      if (!userRole || userRole !== 'veterinarian') {
        throw new Error('Seuls les vétérinaires peuvent répondre aux rendez-vous');
      }

      setLoading(true);
      setError(null);

      try {
        const updatedAppointment = await updateAppointment(id, dto);
        // Recharger la liste
        await loadAppointments();
        return updatedAppointment;
      } catch (err: any) {
        logger.error('Erreur lors de la mise à jour du rendez-vous:', err);
        setError(err.message || 'Erreur lors de la mise à jour du rendez-vous');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [userRole, loadAppointments],
  );

  /**
   * Annuler un rendez-vous
   */
  const cancel = useCallback(
    async (id: string): Promise<Appointment> => {
      if (!userRole) {
        throw new Error('Utilisateur non authentifié');
      }

      setLoading(true);
      setError(null);

      try {
        const cancelledAppointment = await cancelAppointment(id);
        // Recharger la liste
        await loadAppointments();
        return cancelledAppointment;
      } catch (err: any) {
        logger.error('Erreur lors de l\'annulation du rendez-vous:', err);
        setError(err.message || 'Erreur lors de l\'annulation du rendez-vous');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [userRole, loadAppointments],
  );

  // Charger les rendez-vous au montage et quand le rôle change
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  return {
    appointments,
    upcomingAppointments,
    loading,
    error,
    create,
    update,
    cancel,
    refresh: loadAppointments,
  };
}
