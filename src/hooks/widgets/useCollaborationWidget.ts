/**
 * Hook spécialisé pour le widget Collaboration
 */

import { useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { loadCollaborateursParProjet } from '../../store/slices/collaborationSlice';
import { useEffect, useRef } from 'react';

export interface CollaborationWidgetData {
  emoji: string;
  title: string;
  primary: number;
  secondary: number;
  labelPrimary: string;
  labelSecondary: string;
}

export function useCollaborationWidget(projetId?: string): CollaborationWidgetData | null {
  const dispatch = useAppDispatch();
  const { collaborateurs } = useAppSelector((state) => state.collaboration);
  const dataChargeesRef = useRef<string | null>(null);

  // Charger les données
  useEffect(() => {
    if (!projetId) {
      dataChargeesRef.current = null;
      return;
    }

    const cle = `collaboration-${projetId}`;
    if (dataChargeesRef.current === cle) return;

    dataChargeesRef.current = cle;
    dispatch(loadCollaborateursParProjet(projetId));
  }, [dispatch, projetId]);

  return useMemo(() => {
    if (!projetId) return null;

    // S'assurer que collaborateurs est un tableau
    const collaborateursArray = Array.isArray(collaborateurs) ? collaborateurs : [];
    const collaborateursActifs = collaborateursArray.filter((c) => c.statut === 'actif');

    return {
      emoji: '👥',
      title: 'Collaboration',
      primary: collaborateursArray.length,
      secondary: collaborateursActifs.length,
      labelPrimary: 'Membres',
      labelSecondary: 'Actifs',
    };
  }, [projetId, collaborateurs]);
}
