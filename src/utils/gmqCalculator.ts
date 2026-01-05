/**
 * Utilitaires pour le calcul du GMQ (Gain Moyen Quotidien)
 * 
 * Le GMQ est calculé en grammes/jour
 */

import { differenceInDays, parseISO } from 'date-fns';

export interface PeseeData {
  poids_kg: number;
  date: string | Date;
}

/**
 * Calcule le GMQ entre deux pesées
 * @param poidsInitial Poids initial en kg
 * @param poidsActuel Poids actuel en kg
 * @param dateInitiale Date de la pesée initiale
 * @param dateActuelle Date de la pesée actuelle
 * @returns GMQ en grammes/jour (arrondi), ou 0 si calcul impossible
 */
export function calculateGMQ(
  poidsInitial: number,
  poidsActuel: number,
  dateInitiale: Date | string,
  dateActuelle: Date | string
): number {
  const dateInit = typeof dateInitiale === 'string' ? parseISO(dateInitiale) : dateInitiale;
  const dateAct = typeof dateActuelle === 'string' ? parseISO(dateActuelle) : dateActuelle;
  
  const joursEcoules = differenceInDays(dateAct, dateInit);
  
  if (joursEcoules <= 0) return 0;
  
  const gainTotal = (poidsActuel - poidsInitial) * 1000; // Convertir en grammes
  const gmq = gainTotal / joursEcoules;
  
  return Math.round(gmq);
}

/**
 * Calcule le GMQ moyen sur une période avec plusieurs pesées
 * @param pesees Array de pesées triées par date (croissante)
 * @returns GMQ moyen en grammes/jour
 */
export function calculateAverageGMQ(pesees: PeseeData[]): number {
  if (pesees.length < 2) return 0;
  
  const premiere = pesees[0];
  const derniere = pesees[pesees.length - 1];
  
  return calculateGMQ(
    premiere.poids_kg,
    derniere.poids_kg,
    premiere.date,
    derniere.date
  );
}

/**
 * Calcule le GMQ par intervalle entre pesées consécutives
 * @param pesees Array de pesées triées par date
 * @returns Array de { date, gmq } pour chaque intervalle
 */
export function calculateGMQByInterval(
  pesees: PeseeData[]
): Array<{ date: string; gmq: number }> {
  const results: Array<{ date: string; gmq: number }> = [];
  
  for (let i = 1; i < pesees.length; i++) {
    const previous = pesees[i - 1];
    const current = pesees[i];
    
    const gmq = calculateGMQ(
      previous.poids_kg,
      current.poids_kg,
      previous.date,
      current.date
    );
    
    const dateStr = typeof current.date === 'string' 
      ? current.date 
      : current.date.toISOString();
    
    results.push({
      date: dateStr,
      gmq,
    });
  }
  
  return results;
}

/**
 * Détermine si une pesée est en retard
 * @param dernierePesee Dernière pesée effectuée (peut être null si jamais pesé)
 * @param frequenceAttendue Fréquence attendue en jours (défaut: 7)
 * @returns true si la pesée est en retard
 */
export function isPeseeEnRetard(
  dernierePesee: PeseeData | null | undefined,
  frequenceAttendue: number = 7
): boolean {
  if (!dernierePesee) return true; // Jamais pesé = en retard
  
  const datePesee = typeof dernierePesee.date === 'string' 
    ? parseISO(dernierePesee.date) 
    : dernierePesee.date;
  
  const joursDepuis = differenceInDays(new Date(), datePesee);
  return joursDepuis > frequenceAttendue;
}

/**
 * Calcule le nombre de jours depuis la dernière pesée
 * @param dernierePesee Dernière pesée effectuée (peut être null)
 * @returns Nombre de jours depuis la dernière pesée, ou undefined si jamais pesé
 */
export function joursDepuisDernierePesee(
  dernierePesee: PeseeData | null | undefined
): number | undefined {
  if (!dernierePesee) return undefined;
  
  const datePesee = typeof dernierePesee.date === 'string' 
    ? parseISO(dernierePesee.date) 
    : dernierePesee.date;
  
  return differenceInDays(new Date(), datePesee);
}

