import { format, parseISO, isValid, formatDistanceToNow, addDays as dateFnsAddDays } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Formate une date de manière sécurisée
 * Gère les cas où la date est null, undefined ou invalide
 */
export const formatSafeDate = (
  dateValue: any,
  formatStr: string = 'dd/MM/yyyy',
  fallback: string = 'Date inconnue'
): string => {
  try {
    if (!dateValue) {
      return fallback;
    }

    // Si c'est une string ISO, parser d'abord
    const date = typeof dateValue === 'string'
      ? parseISO(dateValue)
      : new Date(dateValue);

    // Vérifier que la date est valide
    if (!isValid(date)) {
      console.warn('[DateUtils] Date invalide:', dateValue);
      return fallback;
    }

    return format(date, formatStr, { locale: fr });
  } catch (error) {
    console.error('[DateUtils] Erreur formatage:', error, dateValue);
    return fallback;
  }
};

/**
 * Formate une date relative (il y a 2 heures, etc.)
 */
export const formatRelativeTime = (
  dateValue: any,
  addSuffix: boolean = true
): string => {
  try {
    if (!dateValue) {
      return 'Récemment';
    }

    const date = typeof dateValue === 'string'
      ? parseISO(dateValue)
      : new Date(dateValue);

    if (!isValid(date)) {
      return 'Récemment';
    }

    return formatDistanceToNow(date, {
      addSuffix,
      locale: fr
    });
  } catch (error) {
    console.error('[DateUtils] Erreur formatage relatif:', error);
    return 'Récemment';
  }
};

/**
 * Vérifie si une date est valide
 */
export const isValidDate = (dateValue: any): boolean => {
  try {
    if (!dateValue) return false;

    const date = typeof dateValue === 'string'
      ? parseISO(dateValue)
      : new Date(dateValue);

    return isValid(date);
  } catch {
    return false;
  }
};

/**
 * Convertit une date en objet Date valide ou null
 */
export const toValidDate = (dateValue: any): Date | null => {
  try {
    if (!dateValue) return null;

    const date = typeof dateValue === 'string'
      ? parseISO(dateValue)
      : new Date(dateValue);

    return isValid(date) ? date : null;
  } catch {
    return null;
  }
};

/**
 * Formate une date locale au format YYYY-MM-DD
 */
export const formatLocalDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '';
    return format(d, 'yyyy-MM-dd');
  } catch {
    return '';
  }
};

/**
 * Parse une date locale au format YYYY-MM-DD vers un objet Date
 */
export const parseLocalDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
};

/**
 * Retourne la date locale actuelle au format YYYY-MM-DD
 */
export const getCurrentLocalDate = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

/**
 * Formate une date pour l'affichage utilisateur (DD/MM/YYYY)
 * Accepte une date ISO string (YYYY-MM-DD) ou un objet Date
 */
export const formatDisplayDate = (
  dateValue: string | Date | null | undefined,
  formatStr: string = 'dd/MM/yyyy'
): string => {
  if (!dateValue) return '';
  
  try {
    const date = typeof dateValue === 'string'
      ? parseISO(dateValue)
      : dateValue;
    
    if (!isValid(date)) {
      console.warn('[DateUtils] formatDisplayDate: date invalide', dateValue);
      return '';
    }
    
    return format(date, formatStr, { locale: fr });
  } catch (error) {
    console.error('[DateUtils] formatDisplayDate erreur:', error, dateValue);
    return '';
  }
};

/**
 * Ajoute un nombre de jours à une date
 * Retourne une nouvelle date au format YYYY-MM-DD
 */
export const addDays = (
  dateValue: string | Date | null | undefined,
  days: number
): string => {
  if (!dateValue) return '';
  
  try {
    const date = typeof dateValue === 'string'
      ? parseISO(dateValue)
      : dateValue;
    
    if (!isValid(date)) {
      console.warn('[DateUtils] addDays: date invalide', dateValue);
      return '';
    }
    
    const newDate = dateFnsAddDays(date, days);
    return format(newDate, 'yyyy-MM-dd');
  } catch (error) {
    console.error('[DateUtils] addDays erreur:', error, dateValue);
    return '';
  }
};