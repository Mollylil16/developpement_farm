/**
 * Hook pour charger les données spécifiques au technicien
 * Fermes assistées, tâches du jour, enregistrements récents
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { getDatabase } from '../services/database';
import { getErrorMessage } from '../types/common';
import { ProjetRepository, CollaborateurRepository, PlanificationRepository } from '../database/repositories';
import { loadPlanificationsParProjet } from '../store/slices/planificationSlice';
import { format, startOfDay, endOfDay, isToday, parseISO } from 'date-fns';

interface TechData {
  assistedFarms: Array<{
    farmId: string;
    farmName: string;
    permissions: any;
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

      const db = await getDatabase();
      const projetRepo = new ProjetRepository(db);
      const collaborateurRepo = new CollaborateurRepository(db);

      // Récupérer les fermes où le technicien est collaborateur
      const allCollaborateurs = await collaborateurRepo.findAll();
      const techCollaborations = allCollaborateurs.filter(
        (collab) => collab.email === user.email || collab.telephone === user.phone
      );

      // Récupérer les projets (fermes) associés
      const assistedFarms: TechData['assistedFarms'] = [];
      for (const collab of techCollaborations) {
        const project = await projetRepo.findById(collab.projet_id);
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

      // Charger les planifications pour toutes les fermes assistées
      const planificationRepo = new PlanificationRepository(db);
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      const todayTasks: TechData['todayTasks'] = [];
      for (const farm of assistedFarms) {
        // Charger les planifications de cette ferme
        const farmPlanifications = await planificationRepo.findByProjet(farm.farmId);
        
        // Filtrer les tâches du jour
        const tasksToday = farmPlanifications.filter((p) => {
          const taskDate = parseISO(p.date_prevue);
          return isToday(taskDate) && (p.statut === 'a_faire' || p.statut === 'en_cours');
        });

        // Convertir en format TaskCard
        for (const planif of tasksToday) {
          const priority = planif.statut === 'en_cours' ? 'high' : 
                          new Date(planif.date_prevue) < today ? 'high' : 'medium';
          
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
      console.error('Erreur lors du chargement des données technicien:', error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }, [user?.id, user?.email, user?.phone, techUserId, projetActif?.id, dispatch]);

  useEffect(() => {
    loadTechData();
  }, [loadTechData]);

  return {
    ...data,
    refresh: loadTechData,
  };
}

