/**
 * Utilitaires de calcul des marges sur les ventes
 * Calcule les marges OPEX et complètes pour chaque vente de porc
 */

import { Revenu } from '../types';

/**
 * Statut de la marge (pour code couleur)
 */
export type StatutMarge = 'negative' | 'faible' | 'confortable';

/**
 * Interface complète pour les marges d'une vente
 */
export interface MargeVente {
  // Données de base
  poids_kg: number;
  prix_vente: number;
  
  // Coûts au kg
  cout_kg_opex: number;
  cout_kg_complet: number;
  
  // Coûts réels
  cout_reel_opex: number;
  cout_reel_complet: number;
  
  // Marges en valeur
  marge_opex: number;
  marge_complete: number;
  
  // Marges en %
  marge_opex_pourcent: number;
  marge_complete_pourcent: number;
  
  // Statut visuel
  statut_marge: StatutMarge;
}

/**
 * Calcule toutes les marges pour une vente de porc
 * @param vente L'objet revenu (vente)
 * @param poids_kg Poids du porc vendu en kg
 * @param cout_kg_opex Coût OPEX par kg au moment de la vente
 * @param cout_kg_complet Coût complet par kg au moment de la vente
 * @returns Objet complet avec tous les calculs de marge
 */
export function calculateMargeVente(
  vente: Revenu,
  poids_kg: number,
  cout_kg_opex: number,
  cout_kg_complet: number
): MargeVente {
  const prix_vente = vente.montant;
  
  // Coûts réels du porc
  const cout_reel_opex = poids_kg * cout_kg_opex;
  const cout_reel_complet = poids_kg * cout_kg_complet;
  
  // Marges en valeur (FCFA)
  const marge_opex = prix_vente - cout_reel_opex;
  const marge_complete = prix_vente - cout_reel_complet;
  
  // Marges en pourcentage
  const marge_opex_pourcent = prix_vente > 0 ? (marge_opex / prix_vente) * 100 : 0;
  const marge_complete_pourcent = prix_vente > 0 ? (marge_complete / prix_vente) * 100 : 0;
  
  // Déterminer le statut de la marge (basé sur la marge OPEX)
  const statut_marge = getStatutMarge(marge_opex_pourcent);
  
  return {
    poids_kg,
    prix_vente,
    cout_kg_opex,
    cout_kg_complet,
    cout_reel_opex,
    cout_reel_complet,
    marge_opex,
    marge_complete,
    marge_opex_pourcent,
    marge_complete_pourcent,
    statut_marge,
  };
}

/**
 * Détermine le statut de la marge selon le pourcentage
 * @param margePourcent Marge en pourcentage
 * @returns Statut : negative, faible ou confortable
 */
export function getStatutMarge(margePourcent: number): StatutMarge {
  if (margePourcent < 0) {
    return 'negative';
  }
  if (margePourcent < 15) {
    return 'faible'; // Marge < 15%
  }
  return 'confortable'; // Marge >= 15%
}

/**
 * Retourne la couleur associée à un statut de marge
 * @param statut Statut de la marge
 * @returns Code couleur hexadécimal
 */
export function getMargeColor(statut: StatutMarge): string {
  switch (statut) {
    case 'negative':
      return '#EF4444'; // Rouge
    case 'faible':
      return '#F59E0B'; // Orange
    case 'confortable':
      return '#10B981'; // Vert
  }
}

/**
 * Retourne un label descriptif pour une marge
 * @param margePourcent Marge en pourcentage
 * @returns Label descriptif
 */
export function getMargeLabel(margePourcent: number): string {
  if (margePourcent < 0) {
    return 'Perte';
  }
  if (margePourcent < 5) {
    return 'Très faible';
  }
  if (margePourcent < 10) {
    return 'Faible';
  }
  if (margePourcent < 15) {
    return 'Correcte';
  }
  if (margePourcent < 25) {
    return 'Bonne';
  }
  return 'Excellente';
}

/**
 * Calcule la marge moyenne sur un ensemble de ventes (basée sur OPEX uniquement)
 * @param ventes Liste des ventes avec marges calculées
 * @returns Marge moyenne en pourcentage (basée sur OPEX)
 */
export function calculateMargeMoyenne(ventes: Revenu[]): number {
  const ventesAvecMarge = ventes.filter((v) => v.marge_opex_pourcent !== undefined);
  
  if (ventesAvecMarge.length === 0) {
    return 0;
  }
  
  const sommeMarges = ventesAvecMarge.reduce(
    (sum, v) => sum + (v.marge_opex_pourcent || 0),
    0
  );
  
  return sommeMarges / ventesAvecMarge.length;
}

/**
 * Calcule le chiffre d'affaires total
 * @param ventes Liste des ventes
 * @returns Montant total du CA
 */
export function calculateChiffreAffaires(ventes: Revenu[]): number {
  return ventes.reduce((sum, v) => sum + v.montant, 0);
}

/**
 * Calcule le bénéfice total (somme des marges OPEX)
 * @param ventes Liste des ventes avec marges calculées
 * @returns Bénéfice total (basé sur OPEX uniquement)
 */
export function calculateBeneficeTotal(ventes: Revenu[]): number {
  return ventes.reduce((sum, v) => sum + (v.marge_opex || 0), 0);
}

/**
 * Statistiques financières complètes
 */
export interface StatistiquesFinancieres {
  chiffre_affaires: number;
  benefice_total: number;
  marge_moyenne_pourcent: number;
  nombre_ventes: number;
  kg_vendus_total: number;
  prix_moyen_kg: number;
}

/**
 * Calcule toutes les statistiques financières
 * @param ventes Liste des ventes avec marges
 * @returns Objet complet de statistiques
 */
export function calculateStatistiquesFinancieres(ventes: Revenu[]): StatistiquesFinancieres {
  const chiffre_affaires = calculateChiffreAffaires(ventes);
  const benefice_total = calculateBeneficeTotal(ventes);
  const marge_moyenne_pourcent = calculateMargeMoyenne(ventes);
  const nombre_ventes = ventes.length;
  const kg_vendus_total = ventes.reduce((sum, v) => sum + (v.poids_kg || 0), 0);
  const prix_moyen_kg = kg_vendus_total > 0 ? chiffre_affaires / kg_vendus_total : 0;
  
  return {
    chiffre_affaires,
    benefice_total,
    marge_moyenne_pourcent,
    nombre_ventes,
    kg_vendus_total,
    prix_moyen_kg,
  };
}

