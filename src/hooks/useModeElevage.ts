/**
 * Hook personnalisé pour détecter le mode d'élevage actif
 * Retourne 'bande' ou 'individuel' selon le projet actif
 */

import { useAppSelector } from '../store/hooks';
import { selectProjetActif } from '../store/selectors/projetSelectors';

export type ModeElevage = 'bande' | 'individuel';

/**
 * Hook pour obtenir le mode d'élevage du projet actif
 * @returns 'bande' si management_method === 'batch', 'individuel' sinon
 */
export function useModeElevage(): ModeElevage {
  const projetActif = useAppSelector(selectProjetActif);
  
  // Par défaut, mode individuel si pas de projet ou management_method non défini
  const managementMethod = projetActif?.management_method || 'individual';
  
  return managementMethod === 'batch' ? 'bande' : 'individuel';
}

/**
 * Hook pour vérifier si le mode actif est "bande"
 */
export function useIsModeBande(): boolean {
  return useModeElevage() === 'bande';
}

/**
 * Hook pour vérifier si le mode actif est "individuel"
 */
export function useIsModeIndividuel(): boolean {
  return useModeElevage() === 'individuel';
}

