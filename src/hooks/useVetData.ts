/**
 * Hook pour charger les données spécifiques au vétérinaire
 * Consultations du jour, clients, alertes sanitaires
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { getErrorMessage } from '../types/common';
import apiClient from '../services/api/apiClient';
import { loadPlanificationsParProjet } from '../store/slices/planificationSlice';
import type { VisiteVeterinaire } from '../types/sante';
import { format, startOfDay, endOfDay, isToday } from 'date-fns';
import { logger } from '../utils/logger';

interface VetData {
  todayConsultations: VisiteVeterinaire[];
  upcomingConsultations: VisiteVeterinaire[];
  clientFarms: Array<{
    farmId: string;
    farmName: string;
    since: string;
    lastConsultation?: string;
    consultationCount: number;
  }>;
  healthAlerts: Array<{
    farmId: string;
    farmName: string;
    alertType: 'disease' | 'vaccination' | 'treatment';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  loading: boolean;
  error: string | null;
}

export function useVetData(vetUserId?: string) {
  const { user } = useAppSelector((state) => state.auth);
  const { projetActif } = useAppSelector((state) => state.projet);
  const dispatch = useAppDispatch();
  const [data, setData] = useState<VetData>({
    todayConsultations: [],
    upcomingConsultations: [],
    clientFarms: [],
    healthAlerts: [],
    loading: true,
    error: null,
  });

  const loadVetData = useCallback(async () => {
    if (!user?.id || !vetUserId) {
      setData((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      setData((prev) => ({ ...prev, loading: true, error: null }));

      // Récupérer le profil vétérinaire pour obtenir la liste des clients
      const vetProfile = user?.roles?.veterinarian;
      const vetClients = vetProfile?.clients || [];

      // Récupérer les collaborations actives du vétérinaire depuis l'API backend
      // Note: L'endpoint /collaborations nécessite un projet_id, donc on utilise /collaborations/invitations
      // pour récupérer toutes les collaborations de l'utilisateur
      let allCollaborations: any[] = [];
      try {
        const response = await apiClient.get<{ data: any[]; pagination: any } | any[]>('/collaborations/invitations', {
          params: { userId: vetUserId },
        });
        allCollaborations = Array.isArray(response) ? response : (response.data || []);
      } catch (error) {
        // Si l'endpoint n'est pas disponible, retourner un tableau vide
        console.warn('Impossible de charger les collaborations:', error);
        allCollaborations = [];
      }
      const activeCollaborations = allCollaborations.filter(
        (c) => c.user_id === vetUserId && c.role === 'veterinaire' && c.statut === 'actif'
      );
      const collaborationProjectIds = activeCollaborations.map((c) => c.projet_id);

      // Combiner les IDs des clients et des collaborations pour obtenir tous les projets accessibles
      const accessibleProjectIds = new Set([
        ...vetClients.map((c) => c.farmId),
        ...collaborationProjectIds,
      ]);

      // Récupérer uniquement les projets accessibles depuis l'API backend
      const allProjects = await apiClient.get<any[]>('/projets');
      const accessibleProjects = allProjects.filter((p) => accessibleProjectIds.has(p.id));

      // Charger les planifications pour le projet actif si disponible
      if (projetActif?.id && accessibleProjectIds.has(projetActif.id)) {
        await dispatch(loadPlanificationsParProjet(projetActif.id));
      }

      // Récupérer toutes les visites vétérinaires des projets accessibles depuis l'API backend
      const allVisites: VisiteVeterinaire[] = [];
      for (const project of accessibleProjects) {
        const visites = await apiClient.get<any[]>(`/sante/visites-veterinaires`, {
          params: { projet_id: project.id },
        });
        allVisites.push(...visites);
      }

      // Filtrer les consultations du jour
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      const todayConsultations = allVisites.filter((visite) => {
        const visiteDate = new Date(visite.date_visite);
        return visiteDate >= todayStart && visiteDate <= todayEnd;
      });

      // Filtrer les consultations à venir (prochaines 7 jours)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const upcomingConsultations = allVisites.filter((visite) => {
        if (visite.prochaine_visite) {
          const nextDate = new Date(visite.prochaine_visite);
          return nextDate > today && nextDate <= nextWeek;
        }
        return false;
      });

      // Grouper les clients (fermes) avec statistiques
      interface ClientData {
        farmId: string;
        farmName: string;
        since: string;
        lastConsultation?: string;
        consultationCount: number;
      }

      const clientMap = new Map<string, ClientData>();

      for (const visite of allVisites) {
        const project = accessibleProjects.find((p) => p.id === visite.projet_id);
        if (!project) continue;

        const existing: ClientData = clientMap.get(visite.projet_id) || {
          farmId: visite.projet_id,
          farmName: project.nom || 'Ferme inconnue',
          since: visite.date_creation,
          consultationCount: 0,
          lastConsultation: undefined,
        };

        existing.consultationCount++;
        if (
          !existing.lastConsultation ||
          new Date(visite.date_visite) > new Date(existing.lastConsultation)
        ) {
          existing.lastConsultation = visite.date_visite;
        }
        if (new Date(visite.date_creation) < new Date(existing.since)) {
          existing.since = visite.date_creation;
        }

        clientMap.set(visite.projet_id, existing);
      }

      const clientFarms = Array.from(clientMap.values());

      // Détecter les alertes sanitaires (maladies récentes, vaccinations manquantes, etc.)
      const healthAlerts: VetData['healthAlerts'] = [];

      for (const project of accessibleProjects) {
        // Vérifier les maladies récentes (derniers 7 jours) depuis l'API backend
        const maladies = await apiClient.get<any[]>(`/sante/maladies`, {
          params: { projet_id: project.id },
        });
        const recentMaladies = maladies.filter((m) => {
          const maladieDate = new Date(m.date_debut);
          const daysAgo = (today.getTime() - maladieDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysAgo <= 7;
        });

        if (recentMaladies.length > 0) {
          healthAlerts.push({
            farmId: project.id,
            farmName: project.nom || 'Ferme inconnue',
            alertType: 'disease',
            message: `${recentMaladies.length} maladie(s) récente(s) détectée(s)`,
            severity: recentMaladies.length > 2 ? 'high' : 'medium',
          });
        }
      }

      setData({
        todayConsultations,
        upcomingConsultations,
        clientFarms,
        healthAlerts,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      logger.error('Erreur lors du chargement des données vétérinaire:', error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }, [user?.id, vetUserId, projetActif?.id, dispatch]);

  useEffect(() => {
    loadVetData();
  }, [loadVetData]);

  return {
    ...data,
    refresh: loadVetData,
  };
}
