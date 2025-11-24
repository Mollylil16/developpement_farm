/**
 * Utilitaires pour la gestion des dates
 */

/**
 * Formate une date ISO en format local (YYYY-MM-DD)
 * @param isoDate Date au format ISO (ex: "2024-01-15T10:30:00.000Z")
 * @returns Date au format local (ex: "2024-01-15")
 */
export function formatLocalDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Erreur lors du formatage de la date:', error);
    return '';
  }
}

/**
 * Parse une date locale (YYYY-MM-DD) en objet Date
 * @param localDate Date au format local (ex: "2024-01-15")
 * @returns Objet Date
 */
export function parseLocalDate(localDate: string): Date {
  try {
    if (!localDate) {
      return new Date();
    }

    // Ajouter l'heure midi pour éviter les problèmes de timezone
    const date = new Date(`${localDate}T12:00:00.000Z`);

    if (isNaN(date.getTime())) {
      return new Date();
    }

    return date;
  } catch (error) {
    console.error('Erreur lors du parsing de la date:', error);
    return new Date();
  }
}

/**
 * Obtient la date actuelle au format local (YYYY-MM-DD)
 * @returns Date actuelle au format local
 */
export function getCurrentLocalDate(): string {
  return formatLocalDate(new Date().toISOString());
}

/**
 * Formate une date pour l'affichage (ex: "15 janvier 2024")
 * @param isoDate Date au format ISO
 * @param locale Locale à utiliser (par défaut 'fr-FR')
 * @returns Date formatée pour l'affichage
 */
export function formatDisplayDate(isoDate: string, locale: string = 'fr-FR'): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Erreur lors du formatage de la date:', error);
    return '';
  }
}

/**
 * Calcule la différence en jours entre deux dates
 * @param date1 Première date (ISO)
 * @param date2 Deuxième date (ISO)
 * @returns Nombre de jours entre les deux dates
 */
export function getDaysDifference(date1: string, date2: string): number {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return 0;
    }

    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch (error) {
    console.error('Erreur lors du calcul de la différence:', error);
    return 0;
  }
}

/**
 * Vérifie si une date est dans le passé
 * @param isoDate Date au format ISO
 * @returns True si la date est dans le passé
 */
export function isDateInPast(isoDate: string): boolean {
  try {
    const date = new Date(isoDate);
    const now = new Date();

    if (isNaN(date.getTime())) {
      return false;
    }

    return date < now;
  } catch (error) {
    console.error('Erreur lors de la vérification de la date:', error);
    return false;
  }
}

/**
 * Vérifie si une date est dans le futur
 * @param isoDate Date au format ISO
 * @returns True si la date est dans le futur
 */
export function isDateInFuture(isoDate: string): boolean {
  try {
    const date = new Date(isoDate);
    const now = new Date();

    if (isNaN(date.getTime())) {
      return false;
    }

    return date > now;
  } catch (error) {
    console.error('Erreur lors de la vérification de la date:', error);
    return false;
  }
}

/**
 * Ajoute des jours à une date
 * @param isoDate Date au format ISO
 * @param days Nombre de jours à ajouter (peut être négatif)
 * @returns Nouvelle date au format ISO
 */
export function addDays(isoDate: string, days: number): string {
  try {
    const date = new Date(isoDate);

    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }

    date.setDate(date.getDate() + days);
    return date.toISOString();
  } catch (error) {
    console.error("Erreur lors de l'ajout de jours:", error);
    return new Date().toISOString();
  }
}
