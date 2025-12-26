/**
 * Service dédié pour l'extraction de dates depuis le texte utilisateur
 * Supporte les dates relatives (demain, hier, lundi prochain) et absolues
 * Adapté au contexte ivoirien (français local)
 */

import { parse, addDays, startOfDay, format, nextDay, addWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '../../../utils/logger';

/**
 * Options d'extraction de date
 */
export interface DateExtractionOptions {
  /**
   * Date de référence (défaut: aujourd'hui)
   */
  referenceDate?: Date | string;
  /**
   * Si true, permet les dates futures (défaut: true)
   */
  allowFuture?: boolean;
  /**
   * Si true, permet les dates passées (défaut: true)
   */
  allowPast?: boolean;
}

/**
 * Service d'extraction de dates
 */
export class DateExtractor {
  /**
   * Extrait une date depuis un texte
   * @param text - Texte à analyser
   * @param options - Options d'extraction
   * @returns Date au format YYYY-MM-DD ou undefined
   */
  static extract(text: string, options: DateExtractionOptions = {}): string | undefined {
    if (!text || typeof text !== 'string') {
      return undefined;
    }

    const normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    // Date de référence
    const refDate = options.referenceDate
      ? typeof options.referenceDate === 'string'
        ? new Date(options.referenceDate)
        : options.referenceDate
      : new Date();
    const today = startOfDay(refDate);

    // 1. Dates relatives courantes
    const relativeDate = this.extractRelativeDate(normalized, today, options);
    if (relativeDate) {
      return relativeDate;
    }

    // 2. Dates absolues (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
    const absoluteDate = this.extractAbsoluteDate(normalized, today);
    if (absoluteDate) {
      return absoluteDate;
    }

    // 3. Par défaut, retourner aujourd'hui si pas de date trouvée
    return format(today, 'yyyy-MM-dd');
  }

  /**
   * Extrait une date relative (aujourd'hui, demain, hier, lundi, etc.)
   */
  private static extractRelativeDate(
    text: string,
    today: Date,
    options: DateExtractionOptions
  ): string | undefined {
    // Aujourd'hui
    if (text.includes("aujourd'hui") || text.includes('aujourd hui') || text === 'aujourdhui') {
      return format(today, 'yyyy-MM-dd');
    }

    // Demain
    if (text.includes('demain')) {
      const tomorrow = addDays(today, 1);
      if (!options.allowFuture) {
        return undefined;
      }
      return format(tomorrow, 'yyyy-MM-dd');
    }

    // Hier
    if (text.includes('hier')) {
      const yesterday = addDays(today, -1);
      if (!options.allowPast) {
        return undefined;
      }
      return format(yesterday, 'yyyy-MM-dd');
    }

    // Après-demain
    if (text.includes('apres demain') || text.includes('après-demain') || text.includes('apres-demain')) {
      const dayAfterTomorrow = addDays(today, 2);
      if (!options.allowFuture) {
        return undefined;
      }
      return format(dayAfterTomorrow, 'yyyy-MM-dd');
    }

    // Jours de la semaine (prochain lundi, etc.)
    const joursSemaine: Record<string, number> = {
      lundi: 1,
      mardi: 2,
      mercredi: 3,
      jeudi: 4,
      vendredi: 5,
      samedi: 6,
      dimanche: 0,
    };

    for (const [jour, jourIndex] of Object.entries(joursSemaine)) {
      if (text.includes(jour)) {
        const isNext = text.includes('prochain') || text.includes('prochaine') || text.includes('la semaine pro');
        const targetDate = isNext ? nextDay(today, jourIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6) : nextDay(today, jourIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6);
        
        if (!options.allowFuture && targetDate > today) {
          return undefined;
        }
        
        return format(targetDate, 'yyyy-MM-dd');
      }
    }

    // "La semaine prochaine" / "semaine pro"
    if (text.includes('semaine pro') || text.includes('semaine prochaine') || text.includes('la semaine pro')) {
      const nextWeek = addWeeks(today, 1);
      if (!options.allowFuture) {
        return undefined;
      }
      return format(nextWeek, 'yyyy-MM-dd');
    }

    // "Le mois prochain" / "mois pro"
    if (text.includes('mois pro') || text.includes('mois prochain')) {
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      if (!options.allowFuture) {
        return undefined;
      }
      return format(startOfDay(nextMonth), 'yyyy-MM-dd');
    }

    return undefined;
  }

  /**
   * Extrait une date absolue (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
   */
  private static extractAbsoluteDate(text: string, today: Date): string | undefined {
    // Pattern 1: DD/MM/YYYY ou DD-MM-YYYY
    const pattern1 = /(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?/;
    const match1 = text.match(pattern1);
    if (match1) {
      try {
        let day = parseInt(match1[1]);
        let month = parseInt(match1[2]);
        let year = match1[3] ? parseInt(match1[3]) : today.getFullYear();

        // Validation
        if (month < 1 || month > 12 || day < 1 || day > 31) {
          return undefined;
        }

        const dateStr = `${day}/${month}/${year}`;
        const parsedDate = parse(dateStr, 'd/M/yyyy', today, { locale: fr });
        const normalizedDate = startOfDay(parsedDate);
        
        if (!isNaN(normalizedDate.getTime())) {
          return format(normalizedDate, 'yyyy-MM-dd');
        }
      } catch (error) {
        logger.debug('[DateExtractor] Erreur parsing date:', error);
        return undefined;
      }
    }

    // Pattern 2: YYYY-MM-DD (format ISO)
    const pattern2 = /(\d{4})[/-](\d{1,2})[/-](\d{1,2})/;
    const match2 = text.match(pattern2);
    if (match2) {
      try {
        const year = parseInt(match2[1]);
        const month = parseInt(match2[2]);
        const day = parseInt(match2[3]);

        // Validation
        if (month < 1 || month > 12 || day < 1 || day > 31) {
          return undefined;
        }

        const date = new Date(year, month - 1, day);
        const normalizedDate = startOfDay(date);
        
        if (!isNaN(normalizedDate.getTime())) {
          return format(normalizedDate, 'yyyy-MM-dd');
        }
      } catch (error) {
        logger.debug('[DateExtractor] Erreur parsing date ISO:', error);
        return undefined;
      }
    }

    return undefined;
  }

  /**
   * Formate une date pour l'affichage (format français)
   */
  static formatForDisplay(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      return format(date, 'dd/MM/yyyy', { locale: fr });
    } catch (error) {
      return dateStr;
    }
  }

  /**
   * Vérifie si une date est valide
   */
  static isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }
}

