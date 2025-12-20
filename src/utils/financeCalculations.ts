/**
 * Utilitaires de calcul financier - OPEX / CAPEX
 * Gestion des coûts de production et amortissements
 */

import { DepensePonctuelle } from '../types';
import { isCapex } from '../types/finance';
import { addMonths, differenceInMonths, isAfter, isBefore, parseISO } from 'date-fns';

/**
 * Calcule l'amortissement mensuel d'une dépense CAPEX
 * @param depense La dépense CAPEX
 * @param dureeAmortissementMois Durée d'amortissement en mois
 * @returns Montant de l'amortissement mensuel
 */
export function getAmortissementMensuel(
  depense: DepensePonctuelle,
  dureeAmortissementMois: number
): number {
  if (!isCapex(depense.categorie)) {
    return 0; // Pas d'amortissement pour OPEX
  }

  if (dureeAmortissementMois <= 0) {
    return 0;
  }

  return depense.montant / dureeAmortissementMois;
}

/**
 * Calcule combien de mois d'une période sont couverts par l'amortissement d'une dépense
 * @param depense La dépense CAPEX
 * @param dateDebut Début de la période
 * @param dateFin Fin de la période
 * @param dureeAmortissementMois Durée totale d'amortissement
 * @returns Nombre de mois de la période couverts par l'amortissement
 */
export function getMoisActifsAmortissement(
  depense: DepensePonctuelle,
  dateDebut: Date,
  dateFin: Date,
  dureeAmortissementMois: number
): number {
  const dateDepense = parseISO(depense.date);
  const finAmortissement = addMonths(dateDepense, dureeAmortissementMois);

  // Si la dépense n'a pas encore commencé ou est terminée avant la période
  if (isAfter(dateDepense, dateFin) || isBefore(finAmortissement, dateDebut)) {
    return 0;
  }

  // Déterminer les bornes effectives
  const debutEffectif = isAfter(dateDepense, dateDebut) ? dateDepense : dateDebut;
  const finEffective = isBefore(finAmortissement, dateFin) ? finAmortissement : dateFin;

  // Calculer le nombre de mois
  const mois = differenceInMonths(finEffective, debutEffectif);

  // Au moins 1 mois si la période couvre partiellement
  return Math.max(1, mois);
}

/**
 * Calcule le total des OPEX sur une période
 * @param depenses Liste de toutes les dépenses
 * @param dateDebut Début de la période
 * @param dateFin Fin de la période
 * @returns Montant total des OPEX
 */
export function calculateTotalOpex(
  depenses: DepensePonctuelle[],
  dateDebut: Date,
  dateFin: Date
): number {
  return depenses
    .filter((d) => !isCapex(d.categorie)) // Filtrer uniquement OPEX
    .filter((d) => {
      const dateDepense = parseISO(d.date);
      return dateDepense >= dateDebut && dateDepense <= dateFin;
    })
    .reduce((sum, d) => sum + d.montant, 0);
}

/**
 * Calcule le total des amortissements CAPEX sur une période
 * @param depenses Liste de toutes les dépenses
 * @param dateDebut Début de la période
 * @param dateFin Fin de la période
 * @param dureeAmortissementMois Durée d'amortissement globale
 * @returns Montant total des amortissements CAPEX
 */
export function calculateTotalAmortissementCapex(
  depenses: DepensePonctuelle[],
  dateDebut: Date,
  dateFin: Date,
  dureeAmortissementMois: number
): number {
  return depenses
    .filter((d) => isCapex(d.categorie)) // Filtrer uniquement CAPEX
    .filter((d) => {
      // Inclure les CAPEX qui sont encore en cours d'amortissement pendant la période
      const dateDepense = parseISO(d.date);
      const finAmortissement = addMonths(dateDepense, dureeAmortissementMois);
      return dateDepense <= dateFin && finAmortissement >= dateDebut;
    })
    .reduce((sum, d) => {
      const amortissementMensuel = getAmortissementMensuel(d, dureeAmortissementMois);
      const moisActifs = getMoisActifsAmortissement(d, dateDebut, dateFin, dureeAmortissementMois);
      return sum + amortissementMensuel * moisActifs;
    }, 0);
}

/**
 * Calcule le coût de production par kg (OPEX seulement)
 * @param totalOpex Total des dépenses OPEX
 * @param totalKgVendus Total des kg vendus
 * @returns Coût OPEX par kg
 */
export function calculateCoutKgOpex(totalOpex: number, totalKgVendus: number): number {
  if (totalKgVendus === 0) {
    return 0;
  }
  return totalOpex / totalKgVendus;
}

/**
 * Calcule le coût de production par kg (OPEX + CAPEX amorti)
 * @param totalOpex Total des dépenses OPEX
 * @param totalAmortissementCapex Total des amortissements CAPEX
 * @param totalKgVendus Total des kg vendus
 * @returns Coût complet par kg
 */
export function calculateCoutKgComplet(
  totalOpex: number,
  totalAmortissementCapex: number,
  totalKgVendus: number
): number {
  if (totalKgVendus === 0) {
    return 0;
  }
  return (totalOpex + totalAmortissementCapex) / totalKgVendus;
}

/**
 * Interface pour les coûts de production d'une période
 * NOTE: Les dates sont des strings (ISO 8601) pour la sérialisation Redux
 */
export interface CoutProductionPeriode {
  dateDebut: string; // Format ISO 8601 (ex: "2025-11-01T00:00:00.000Z")
  dateFin: string; // Format ISO 8601 (ex: "2025-11-30T23:59:59.999Z")
  total_opex: number;
  total_amortissement_capex: number;
  total_kg_vendus: number;
  cout_kg_opex: number;
  cout_kg_complet: number;
}

/**
 * Calcule tous les coûts de production pour une période
 * @param depenses Liste de toutes les dépenses
 * @param totalKgVendus Total des kg vendus sur la période
 * @param dateDebut Début de la période
 * @param dateFin Fin de la période
 * @param dureeAmortissementMois Durée d'amortissement globale
 * @returns Objet complet avec tous les coûts
 */
export function calculateCoutsPeriode(
  depenses: DepensePonctuelle[],
  totalKgVendus: number,
  dateDebut: Date,
  dateFin: Date,
  dureeAmortissementMois: number
): CoutProductionPeriode {
  const total_opex = calculateTotalOpex(depenses, dateDebut, dateFin);
  const total_amortissement_capex = calculateTotalAmortissementCapex(
    depenses,
    dateDebut,
    dateFin,
    dureeAmortissementMois
  );

  const cout_kg_opex = calculateCoutKgOpex(total_opex, totalKgVendus);
  const cout_kg_complet = calculateCoutKgComplet(
    total_opex,
    total_amortissement_capex,
    totalKgVendus
  );

  return {
    dateDebut: dateDebut.toISOString(),
    dateFin: dateFin.toISOString(),
    total_opex,
    total_amortissement_capex,
    total_kg_vendus: totalKgVendus,
    cout_kg_opex,
    cout_kg_complet,
  };
}

/**
 * Interface pour les amortissements mensuels par catégorie CAPEX
 */
export interface AmortissementParCategorie {
  categorie: string;
  label: string;
  montant_total: number; // Montant total investi dans cette catégorie
  amortissement_mensuel_total: number; // Amortissement mensuel total pour cette catégorie
  nombre_investissements: number; // Nombre d'investissements dans cette catégorie
  depenses: Array<{
    id: string;
    libelle?: string;
    montant: number;
    date: string;
    amortissement_mensuel: number;
    date_fin_amortissement: string;
  }>;
}

/**
 * Calcule les amortissements mensuels par catégorie CAPEX
 * @param depenses Liste de toutes les dépenses
 * @param dureeAmortissementMois Durée d'amortissement globale
 * @returns Tableau des amortissements par catégorie
 */
export function calculateAmortissementsParCategorie(
  depenses: DepensePonctuelle[],
  dureeAmortissementMois: number
): AmortissementParCategorie[] {
  const depensesCapex = depenses.filter((d) => isCapex(d.categorie));

  // Grouper par catégorie
  const parCategorie = new Map<string, DepensePonctuelle[]>();

  depensesCapex.forEach((depense) => {
    const categorie = depense.categorie;
    if (!parCategorie.has(categorie)) {
      parCategorie.set(categorie, []);
    }
    parCategorie.get(categorie)!.push(depense);
  });

  // Calculer les amortissements pour chaque catégorie
  const resultats: AmortissementParCategorie[] = [];

  parCategorie.forEach((depensesCategorie, categorie) => {
    const montantTotal = depensesCategorie.reduce((sum, d) => sum + d.montant, 0);
    const amortissementMensuelTotal = depensesCategorie.reduce((sum, d) => {
      return sum + getAmortissementMensuel(d, dureeAmortissementMois);
    }, 0);

    const depensesDetaillees = depensesCategorie.map((d) => {
      const dateDepense = parseISO(d.date);
      const dateFinAmortissement = addMonths(dateDepense, dureeAmortissementMois);

      return {
        id: d.id,
        libelle: d.libelle_categorie || undefined,
        montant: d.montant,
        date: d.date,
        amortissement_mensuel: getAmortissementMensuel(d, dureeAmortissementMois),
        date_fin_amortissement: dateFinAmortissement.toISOString(),
      };
    });

    resultats.push({
      categorie,
      label: categorie, // Sera remplacé par le label dans le composant
      montant_total: montantTotal,
      amortissement_mensuel_total: amortissementMensuelTotal,
      nombre_investissements: depensesCategorie.length,
      depenses: depensesDetaillees,
    });
  });

  // Trier par montant total décroissant
  return resultats.sort((a, b) => b.montant_total - a.montant_total);
}
