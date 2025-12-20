/**
 * Hook custom pour gérer l'export PDF du Dashboard
 * Responsabilités:
 * - Récupérer toutes les données nécessaires
 * - Calculer les statistiques
 * - Générer le PDF
 * - Gérer l'état d'export
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { selectAllAnimaux, selectPeseesParAnimal } from '../store/selectors/productionSelectors';
import {
  selectAllChargesFixes,
  selectAllDepensesPonctuelles,
  selectAllRevenus,
} from '../store/selectors/financeSelectors';
import { selectAllGestations, selectAllSevrages } from '../store/selectors/reproductionSelectors';
import { exportDashboardPDF } from '../services/pdf/dashboardPDF';

interface UseDashboardExportReturn {
  exportingPDF: boolean;
  handleExportPDF: () => Promise<void>;
}

export function useDashboardExport(projetActif: unknown): UseDashboardExportReturn {
  const [exportingPDF, setExportingPDF] = useState(false);

  // Récupérer toutes les données depuis le store
  const animaux = useAppSelector(selectAllAnimaux);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  const chargesFixes = useAppSelector(selectAllChargesFixes);
  const depensesPonctuelles = useAppSelector(selectAllDepensesPonctuelles);
  const revenus = useAppSelector(selectAllRevenus);
  const gestations = useAppSelector(selectAllGestations);
  const sevrages = useAppSelector(selectAllSevrages);

  /**
   * Génère et exporte le PDF du dashboard
   */
  const handleExportPDF = useCallback(async () => {
    if (!projetActif) return;

    setExportingPDF(true);
    try {
      // Calculer les totaux financiers
      const totalCharges = chargesFixes.reduce((sum, c) => sum + c.montant, 0);
      const totalDepenses = depensesPonctuelles.reduce((sum, d) => sum + d.montant, 0);
      const totalRevenus = revenus.reduce((sum, r) => sum + r.montant, 0);
      const solde = totalRevenus - (totalCharges + totalDepenses);

      // Calculer les stats de production
      const animauxActifs = animaux.filter((a) => a.statut?.toLowerCase() === 'actif');

      // Récupérer toutes les pesées
      const toutesPesees = Object.values(peseesParAnimal).flat();
      const peseesRecentes = toutesPesees.slice(0, 20);

      // Calculer le poids total basé sur la dernière pesée de chaque animal
      const poidsTotal = animauxActifs.reduce((sum: number, animal) => {
        const pesees = peseesParAnimal[animal.id];
        if (pesees && pesees.length > 0) {
          return sum + pesees[0].poids_kg;
        }
        return sum;
      }, 0);

      // Calculer le GMQ moyen
      const gmqValues = toutesPesees.filter((p) => p.gmq).map((p) => p.gmq as number);
      const gmqMoyen =
        gmqValues.length > 0 ? gmqValues.reduce((sum, val) => sum + val, 0) / gmqValues.length : 0;

      // Calculer les stats de reproduction
      const gestationsEnCours = gestations.filter((g) => !g.date_fin && !g.date_mise_bas_effective);
      const sevragesTotalPorcelets = sevrages.reduce(
        (sum, s) => sum + (s.nombre_porcelets || 0),
        0
      );

      // Préparer les données pour le PDF
      const dashboardData = {
        projet: {
          nom: projetActif.nom,
          description: projetActif.description || '',
          dateCreation: projetActif.date_creation,
        },
        statistiques: {
          production: {
            nombreAnimaux: animauxActifs.length,
            poidsTotal: Math.round(poidsTotal),
            gmqMoyen: Math.round(gmqMoyen),
          },
          reproduction: {
            gestationsEnCours: gestationsEnCours.length,
            totalSevrages: sevrages.length,
            totalPorcelets: sevragesTotalPorcelets,
          },
          finance: {
            totalRevenus,
            totalCharges,
            totalDepenses,
            solde,
          },
        },
        animaux: animauxActifs.map((a) => ({
          code: a.code,
          nom: a.nom || '',
          sexe: a.sexe,
          statut: a.statut || '',
          dateEntree: a.date_entree,
        })),
        peseesRecentes: peseesRecentes.map((p) => ({
          animalCode: animaux.find((a) => a.id === p.animal_id)?.code || '',
          date: p.date,
          poids: p.poids_kg,
          gmq: p.gmq || null,
        })),
        gestationsActives: gestationsEnCours.map((g) => ({
          truieCode: animaux.find((a) => a.id === g.truie_id)?.code || '',
          dateSaillie: g.date_saillie,
          dateMiseBasPrevue: g.date_mise_bas_prevue,
        })),
      };

      // Générer le PDF
      await exportDashboardPDF(dashboardData);

      Alert.alert(
        'PDF généré avec succès',
        'Le rapport dashboard a été généré et est prêt à être partagé.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      Alert.alert('Erreur', 'Impossible de générer le PDF. Vérifiez vos données et réessayez.', [
        { text: 'OK' },
      ]);
    } finally {
      setExportingPDF(false);
    }
  }, [
    projetActif,
    animaux,
    chargesFixes,
    depensesPonctuelles,
    revenus,
    gestations,
    sevrages,
    peseesParAnimal,
  ]);

  return {
    exportingPDF,
    handleExportPDF,
  };
}
