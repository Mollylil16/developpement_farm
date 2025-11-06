/**
 * Types pour le module Collaboration
 */

export type RoleCollaborateur = 'proprietaire' | 'gestionnaire' | 'veterinaire' | 'ouvrier' | 'observateur';
export type StatutCollaborateur = 'actif' | 'inactif' | 'en_attente';

export interface Collaborateur {
  id: string;
  projet_id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: RoleCollaborateur;
  statut: StatutCollaborateur;
  permissions: {
    reproduction: boolean;
    nutrition: boolean;
    finance: boolean;
    rapports: boolean;
    planification: boolean;
    mortalites: boolean;
  };
  date_invitation: string; // Date ISO
  date_acceptation?: string; // Date ISO
  notes?: string;
  date_creation: string;
  derniere_modification: string;
}

export interface CreateCollaborateurInput {
  projet_id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: RoleCollaborateur;
  statut?: StatutCollaborateur;
  permissions?: {
    reproduction?: boolean;
    nutrition?: boolean;
    finance?: boolean;
    rapports?: boolean;
    planification?: boolean;
    mortalites?: boolean;
  };
  notes?: string;
}

export interface UpdateCollaborateurInput {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  role?: RoleCollaborateur;
  statut?: StatutCollaborateur;
  permissions?: {
    reproduction?: boolean;
    nutrition?: boolean;
    finance?: boolean;
    rapports?: boolean;
    planification?: boolean;
    mortalites?: boolean;
  };
  date_acceptation?: string;
  notes?: string;
}

export const ROLE_LABELS: Record<RoleCollaborateur, string> = {
  proprietaire: 'Propriétaire',
  gestionnaire: 'Gestionnaire',
  veterinaire: 'Vétérinaire',
  ouvrier: 'Ouvrier',
  observateur: 'Observateur',
};

export const STATUT_LABELS: Record<StatutCollaborateur, string> = {
  actif: 'Actif',
  inactif: 'Inactif',
  en_attente: 'En attente',
};

export const DEFAULT_PERMISSIONS: Record<RoleCollaborateur, Collaborateur['permissions']> = {
  proprietaire: {
    reproduction: true,
    nutrition: true,
    finance: true,
    rapports: true,
    planification: true,
    mortalites: true,
  },
  gestionnaire: {
    reproduction: true,
    nutrition: true,
    finance: true,
    rapports: true,
    planification: true,
    mortalites: true,
  },
  veterinaire: {
    reproduction: true,
    nutrition: true,
    finance: false,
    rapports: true,
    planification: true,
    mortalites: true,
  },
  ouvrier: {
    reproduction: true,
    nutrition: true,
    finance: false,
    rapports: false,
    planification: true,
    mortalites: true,
  },
  observateur: {
    reproduction: false,
    nutrition: false,
    finance: false,
    rapports: true,
    planification: false,
    mortalites: false,
  },
};

