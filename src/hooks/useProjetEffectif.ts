/**
 * Hook pour obtenir le projet actif selon le rôle de l'utilisateur
 * 
 * Ce hook centralise la logique de sélection du projet:
 * - Pour les producteurs: utilise projetActif (state.projet)
 * - Pour les vétérinaires/techniciens: utilise projetCollaboratifActif (state.collaboration)
 * 
 * Cela permet aux collaborateurs d'accéder aux données des projets
 * auxquels ils sont associés avec les permissions appropriées.
 */

import { useAppSelector } from '../store/hooks';
import { useRole } from '../contexts/RoleContext';
import type { Projet } from '../types/projet';

/**
 * Hook pour obtenir le projet actif selon le rôle de l'utilisateur
 * 
 * @returns Le projet actif approprié ou null
 * 
 * @example
 * // Dans un composant ou hook
 * const projetActif = useProjetEffectif();
 * 
 * if (projetActif?.id) {
 *   dispatch(loadVaccinations(projetActif.id));
 * }
 */
export function useProjetEffectif(): Projet | null {
  const { activeRole } = useRole();
  const projetActif = useAppSelector((state) => state.projet?.projetActif);
  const projetCollaboratifActif = useAppSelector((state) => state.collaboration?.projetCollaboratifActif);

  // Pour vétérinaires et techniciens, utiliser le projet collaboratif
  if (activeRole === 'veterinarian' || activeRole === 'technician') {
    return projetCollaboratifActif || projetActif; // Fallback sur projetActif si pas de projet collaboratif
  }

  // Pour producteurs et autres rôles, utiliser le projet actif
  return projetActif;
}

/**
 * Hook pour obtenir l'ID du projet actif selon le rôle
 * Utile pour les dépendances de useEffect/useCallback
 * 
 * @returns L'ID du projet actif ou undefined
 */
export function useProjetEffectifId(): string | undefined {
  const projetActif = useProjetEffectif();
  return projetActif?.id;
}

export default useProjetEffectif;
