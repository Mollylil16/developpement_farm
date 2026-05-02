import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { ajouterActiviteLocale } from '../store/slices/collaborationSlice';
import { ActiviteUtilisateur } from '../types';

/**
 * Hook pour enregistrer automatiquement les activités utilisateur
 * @param action Type d'action effectuée
 * @param typeDonnee Type de données modifiées
 * @param description Description de l'action
 * @param details Détails supplémentaires (optionnel)
 */
export const useEnregistrerActivite = (
  action: ActiviteUtilisateur['action'],
  typeDonnee: ActiviteUtilisateur['typeDonnee'],
  description: string,
  details?: Record<string, any>
) => {
  const dispatch = useDispatch<AppDispatch>();
  const { utilisateurActuel } = useSelector((state: RootState) => state.collaboration);

  const enregistrerActivite = () => {
    if (!utilisateurActuel) return;

    const activite: Omit<ActiviteUtilisateur, 'id' | 'date'> = {
      utilisateurId: utilisateurActuel.id,
      utilisateurNom: utilisateurActuel.nom,
      action,
      typeDonnee,
      description,
      details,
    };

    dispatch(ajouterActiviteLocale(activite as ActiviteUtilisateur));
  };

  return enregistrerActivite;
};

/**
 * Hook pour enregistrer automatiquement les activités lors de modifications de données
 * @param typeDonnee Type de données modifiées
 * @param action Type d'action (par défaut: 'modification')
 */
export const useActiviteAuto = (
  typeDonnee: ActiviteUtilisateur['typeDonnee'],
  action: ActiviteUtilisateur['action'] = 'modification'
) => {
  const dispatch = useDispatch<AppDispatch>();
  const { utilisateurActuel } = useSelector((state: RootState) => state.collaboration);

  const enregistrerActiviteAuto = (description: string, details?: Record<string, any>) => {
    if (!utilisateurActuel) return;

    const activite: Omit<ActiviteUtilisateur, 'id' | 'date'> = {
      utilisateurId: utilisateurActuel.id,
      utilisateurNom: utilisateurActuel.nom,
      action,
      typeDonnee,
      description,
      details,
    };

    dispatch(ajouterActiviteLocale(activite as ActiviteUtilisateur));
  };

  return enregistrerActiviteAuto;
};

/**
 * Hook pour obtenir les informations de l'utilisateur actuel
 */
export const useUtilisateurActuel = () => {
  const { utilisateurActuel, projetActuel } = useSelector((state: RootState) => state.collaboration);
  
  return {
    utilisateurActuel,
    projetActuel,
    estProprietaire: projetActuel?.proprietaireId === utilisateurActuel?.id,
    peutModifier: (section: keyof NonNullable<typeof projetActuel>['permissions']) => {
      if (!projetActuel || !utilisateurActuel) return false;
      if (utilisateurActuel.role === 'proprietaire') return true;
      if (utilisateurActuel.role === 'lecteur') return false;
      return projetActuel.permissions[section];
    },
  };
};
