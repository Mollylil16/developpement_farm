/**
 * Badge d'affichage de la méthode de gestion d'élevage
 * Affiche si le projet utilise un suivi individuel ou par bande
 */

import React from 'react';
import { useAppSelector } from '../store/hooks';
import { selectProjetActif } from '../store/selectors/projetSelectors';
import Badge from './Badge';

export default function ManagementMethodBadge() {
  const projetActif = useAppSelector(selectProjetActif);

  if (!projetActif) {
    return null;
  }

  const method = projetActif.management_method || 'individual';

  return (
    <Badge variant={method === 'individual' ? 'primary' : 'success'} size="small">
      {method === 'individual' ? '👤 Suivi individuel' : '👥 Suivi par bande'}
    </Badge>
  );
}

