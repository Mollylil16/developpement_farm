/**
 * Hook pour charger les données spécifiques au vétérinaire
 * Consultations du jour, clients, alertes sanitaires
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { getDatabase } from '../services/database';
import { getErrorMessage } from '../types/common';
import { VisiteVeterinaireRepository, ProjetRepository, MaladieRepository, CollaborateurRepository } from '../database/repositories';
import { loadPlanificationsParProjet } from '../store/slices/planificationSlice';
import type { VisiteVeterinaire } from '../types/sante';
import { format, startOfDay, endOfDay, isToday } from 'date-fns';

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

      const db = await getDatabase();
      const visiteRepo = new VisiteVeterinaireRepository(db);
      const projetRepo = new ProjetRepository(db);
      const maladieRepo = new MaladieRepository(db);
      const collaborateurRepo = new CollaborateurRepository(db);

      // Récupérer le profil vétérinaire pour obtenir la liste des clients
      const vetProfile = user?.roles?.veterinarian;
      const vetClients = vetProfile?.clients || [];

      // Récupérer les collaborations actives du vétérinaire
      const activeCollaborations = await collaborateurRepo.findActifsByUserId(vetUserId);
      const collaborationProjectIds = activeCollaborations
        .filter(c => c.role === 'veterinaire')
        .map(c => c.projet_id);

      // Combiner les IDs des clients et des collaborations pour obtenir tous les projets accessibles
      const accessibleProjectIds = new Set([
        ...vetClients.map(c => c.farmId),
        ...collaborationProjectIds,
      ]);

      // Récupérer uniquement les projets accessibles
      const allProjects = await projetRepo.findAll();
      const accessibleProjects = allProjects.filter(p => accessibleProjectIds.has(p.id));

      // Charger les planifications pour le projet actif si disponible
      if (projetActif?.id && accessibleProjectIds.has(projetActif.id)) {
        await dispatch(loadPlanificationsParProjet(projetActif.id));
      }

      // Récupérer toutes les visites vétérinaires des projets accessibles
      const allVisites: VisiteVeterinaire[] = [];
      for (const project of accessibleProjects) {
        const visites = await visiteRepo.findByProjet(project.id);
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
      const clientMap = new Map<string, {
        farmId: string;
        farmName: string;
        since: string;
        lastConsultation?: string;
        consultationCount: number;
      }>();

      for (const visite of allVisites) {
        const project = accessibleProjects.find((p) => p.id === visite.projet_id);
        if (!project) continue;

        const existing = clientMap.get(visite.projet_id) || {
          farmId: visite.projet_id,
          farmName: project.nom || 'Ferme inconnue',
          since: visite.date_creation,
          consultationCount: 0,
        };

        existing.consultationCount++;
        if (!existing.lastConsultation || new Date(visite.date_visite) > new Date(existing.lastConsultation)) {
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
        // Vérifier les maladies récentes (derniers 7 jours)
        const maladies = await maladieRepo.findByProjet(project.id);
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
      console.error('Erreur lors du chargement des données vétérinaire:', error);
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

