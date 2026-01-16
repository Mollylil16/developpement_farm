/**
 * Hook pour charger les données spécifiques au technicien
 * Fermes assistées, tâches du jour, enregistrements récents
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { getErrorMessage } from '../types/common';
import apiClient from '../services/api/apiClient';
import { loadPlanificationsParProjet } from '../store/slices/planificationSlice';
import { format, startOfDay, endOfDay, isToday, parseISO } from 'date-fns';
import { logger } from '../utils/logger';

interface TechData {
  assistedFarms: Array<{
    farmId: string;
    farmName: string;
    permissions?: {
      canViewHerd?: boolean;
      canEditHerd?: boolean;
      canViewHealthRecords?: boolean;
      canEditHealthRecords?: boolean;
    };
    since: string;
    taskCount: number;
  }>;
  todayTasks: Array<{
    id: string;
    farmId: string;
    farmName: string;
    taskType: string;
    description: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  recentRecords: Array<{
    id: string;
    farmId: string;
    farmName: string;
    recordType: 'pesee' | 'vaccination' | 'traitement' | 'visite';
    date: string;
    description: string;
  }>;
  loading: boolean;
  error: string | null;
}

export function useTechData(techUserId?: string) {
  const { user } = useAppSelector((state) => state.auth);
  const { projetActif } = useAppSelector((state) => state.projet);
  const { planifications } = useAppSelector((state) => state.planification);
  const dispatch = useAppDispatch();
  const [data, setData] = useState<TechData>({
    assistedFarms: [],
    todayTasks: [],
    recentRecords: [],
    loading: true,
    error: null,
  });

  const loadTechData = useCallback(async () => {
    if (!user?.id || !techUserId) {
      setData((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData((prev) => ({ ...prev, loading: true, error: null }));

      // Récupérer les fermes où le technicien est collaborateur depuis l'API backend
      // Note: L'endpoint /collaborations nécessite un projet_id, donc on utilise /collaborations/invitations
      // pour récupérer toutes les collaborations de l'utilisateur
      let allCollaborateurs: any[] = [];
      try {
        const response = await apiClient.get<{ data: any[]; pagination: any } | any[]>('/collaborations/invitations', {
          params: { 
            userId: techUserId,
            email: user.email,
            telephone: user.telephone,
          },
        });
        allCollaborateurs = Array.isArray(response) ? response : (response.data || []);
      } catch (error) {
        // Si l'endpoint n'est pas disponible, retourner un tableau vide
        console.warn('Impossible de charger les collaborations:', error);
        allCollaborateurs = [];
      }
      const techCollaborations = allCollaborateurs.filter(
        (collab) => collab.email === user.email || collab.telephone === user.telephone
      );

      // Récupérer les projets (fermes) associés depuis l'API backend
      const assistedFarms: TechData['assistedFarms'] = [];
      for (const collab of techCollaborations) {
        const project = await apiClient.get<any>(`/projets/${collab.projet_id}`);
        if (project) {
          assistedFarms.push({
            farmId: project.id,
            farmName: project.nom || 'Ferme inconnue',
            permissions: collab.permissions || {},
            since: collab.date_creation || new Date().toISOString(),
            taskCount: 0, // À calculer selon les besoins
          });
        }
      }

      // Charger les planifications pour le projet actif si disponible
      if (projetActif?.id) {
        await dispatch(loadPlanificationsParProjet(projetActif.id));
      }

      // Charger les planifications pour toutes les fermes assistées depuis l'API backend
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      const todayTasks: TechData['todayTasks'] = [];
      for (const farm of assistedFarms) {
        // Charger les planifications de cette ferme depuis l'API backend
        const farmPlanifications = await apiClient.get<any[]>(`/planification/planifications`, {
          params: { projet_id: farm.farmId },
        });

        // Filtrer les tâches du jour
        const tasksToday = farmPlanifications.filter((p) => {
          const taskDate = parseISO(p.date_prevue);
          return isToday(taskDate) && (p.statut === 'a_faire' || p.statut === 'en_cours');
        });

        // Convertir en format TaskCard
        for (const planif of tasksToday) {
          const priority =
            planif.statut === 'en_cours'
              ? 'high'
              : new Date(planif.date_prevue) < today
                ? 'high'
                : 'medium';

          todayTasks.push({
            id: planif.id,
            farmId: farm.farmId,
            farmName: farm.farmName,
            taskType: planif.type || 'autre',
            description: planif.titre || planif.description || 'Tâche sans description',
            dueDate: planif.date_prevue,
            priority: priority as 'low' | 'medium' | 'high',
          });
        }
      }

      // Générer des enregistrements récents (exemple - à adapter)
      const recentRecords: TechData['recentRecords'] = [];
      for (const farm of assistedFarms.slice(0, 5)) {
        recentRecords.push({
          id: `record-${farm.farmId}-1`,
          farmId: farm.farmId,
          farmName: farm.farmName,
          recordType: 'pesee',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          description: 'Pesée effectuée',
        });
      }

      setData({
        assistedFarms,
        todayTasks,
        recentRecords,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      logger.error('Erreur lors du chargement des données technicien:', error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }, [user?.id, user?.email, user?.telephone, techUserId, projetActif?.id, dispatch]);

  useEffect(() => {
    loadTechData();
  }, [loadTechData]);

  return {
    ...data,
    refresh: loadTechData,
  };
}
