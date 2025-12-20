/**
 * Utilitaires de formatage robustes
 * Toutes les fonctions gèrent undefined/null/NaN gracieusement
 */

/**
 * Formate un montant en FCFA avec espaces comme séparateurs de milliers
 * @param montant - Montant à formater
 * @returns Chaîne formatée (ex: "1 234 567")
 */
export function formatMontant(montant: number | undefined | null): string {
  if (montant === undefined || montant === null || isNaN(montant)) {
    return '0';
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(montant);
}

/**
 * Formate un montant avec la devise FCFA
 * @param montant - Montant à formater
 * @returns Chaîne formatée avec devise (ex: "1 234 567 FCFA")
 */
export function formatMontantAvecDevise(montant: number | undefined | null): string {
  const formatted = formatMontant(montant);
  return `${formatted} FCFA`;
}

/**
 * Formate un nombre décimal avec précision spécifiée
 * @param nombre - Nombre à formater
 * @param decimales - Nombre de décimales (défaut: 2)
 * @returns Chaîne formatée (ex: "123.45")
 */
export function formatNombre(nombre: number | undefined | null, decimales: number = 2): string {
  if (nombre === undefined || nombre === null || isNaN(nombre)) {
    return '0';
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(nombre);
}

/**
 * Formate un poids en kg
 * @param poids - Poids en kg
 * @param decimales - Nombre de décimales (défaut: 1)
 * @returns Chaîne formatée (ex: "120.5 kg")
 */
export function formatPoids(poids: number | undefined | null, decimales: number = 1): string {
  if (poids === undefined || poids === null || isNaN(poids)) {
    return '0 kg';
  }

  return `${formatNombre(poids, decimales)} kg`;
}

/**
 * Formate un pourcentage
 * @param valeur - Valeur à formater (0-100)
 * @param decimales - Nombre de décimales (défaut: 1)
 * @returns Chaîne formatée (ex: "25.5%")
 */
export function formatPourcentage(
  valeur: number | undefined | null,
  decimales: number = 1
): string {
  if (valeur === undefined || valeur === null || isNaN(valeur)) {
    return '0%';
  }

  return `${formatNombre(valeur, decimales)}%`;
}

/**
 * Parse un montant depuis une chaîne (gère les espaces et virgules)
 * @param montantStr - Chaîne à parser
 * @returns Nombre parsé ou 0 si invalide
 */
export function parseMontant(montantStr: string | undefined | null): number {
  if (!montantStr || typeof montantStr !== 'string') {
    return 0;
  }

  // Retirer les espaces et remplacer les virgules par des points
  const cleaned = montantStr.replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse un nombre depuis une chaîne
 * @param nombreStr - Chaîne à parser
 * @param defaultValue - Valeur par défaut si invalide (défaut: 0)
 * @returns Nombre parsé ou valeur par défaut
 */
export function parseNombre(
  nombreStr: string | undefined | null,
  defaultValue: number = 0
): number {
  if (!nombreStr || typeof nombreStr !== 'string') {
    return defaultValue;
  }

  const cleaned = nombreStr.replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Calcule un pourcentage (partie / total * 100)
 * @param partie - Partie
 * @param total - Total
 * @returns Pourcentage calculé (0 si total est 0)
 */
export function calculatePercentage(
  partie: number | undefined | null,
  total: number | undefined | null
): number {
  const p = partie ?? 0;
  const t = total ?? 0;

  if (t === 0) {
    return 0;
  }

  return (p / t) * 100;
}

/**
 * Formate une date au format français
 * @param date - Date à formater (string ISO ou Date)
 * @param format - Format optionnel: 'HH:mm' pour heure, 'relative' pour relatif
 * @returns Chaîne formatée (ex: "26 nov. 2024", "14:30", "il y a 2h")
 */
export function formatDate(
  date: string | Date | undefined | null,
  format?: 'HH:mm' | 'relative'
): string {
  if (!date) {
    return '-';
  }

  try {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) {
      return '-';
    }

    // Format heure uniquement
    if (format === 'HH:mm') {
      return d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // Format relatif (il y a X)
    if (format === 'relative') {
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) {
        return "À l'instant";
      } else if (diffMin < 60) {
        return `Il y a ${diffMin} min`;
      } else if (diffHour < 24) {
        return `Il y a ${diffHour}h`;
      } else if (diffDay === 1) {
        return 'Hier';
      } else if (diffDay < 7) {
        return `Il y a ${diffDay}j`;
      } else {
        // Plus de 7 jours, afficher la date
        return new Intl.DateTimeFormat('fr-FR', {
          day: '2-digit',
          month: 'short',
        }).format(d);
      }
    }

    // Format par défaut
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch (error) {
    console.error('Erreur formatage date:', error);
    return '-';
  }
}

/**
 * Formate une date au format court
 * @param date - Date à formater
 * @returns Chaîne formatée (ex: "26/11/2024")
 */
export function formatDateCourt(date: string | Date | undefined | null): string {
  if (!date) {
    return '-';
  }

  try {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch (error) {
    console.error('Erreur formatage date:', error);
    return '-';
  }
}

/**
 * Arrondit un nombre à N décimales
 * @param nombre - Nombre à arrondir
 * @param decimales - Nombre de décimales (défaut: 2)
 * @returns Nombre arrondi
 */
export function roundTo(nombre: number | undefined | null, decimales: number = 2): number {
  if (nombre === undefined || nombre === null || isNaN(nombre)) {
    return 0;
  }

  const multiplier = Math.pow(10, decimales);
  return Math.round(nombre * multiplier) / multiplier;
}

/**
 * Limite un nombre entre min et max
 * @param nombre - Nombre à limiter
 * @param min - Valeur minimale
 * @param max - Valeur maximale
 * @returns Nombre limité
 */
export function clamp(nombre: number | undefined | null, min: number, max: number): number {
  const n = nombre ?? 0;
  return Math.min(Math.max(n, min), max);
}

/**
 * Vérifie si une valeur est un nombre valide
 * @param valeur - Valeur à vérifier
 * @returns true si valide
 */
export function isValidNumber(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && !isNaN(valeur) && isFinite(valeur);
}

/**
 * Convertit une valeur en nombre sécurisé
 * @param valeur - Valeur à convertir
 * @param defaultValue - Valeur par défaut (défaut: 0)
 * @returns Nombre sécurisé
 */
export function toSafeNumber(valeur: unknown, defaultValue: number = 0): number {
  if (isValidNumber(valeur)) {
    return valeur;
  }

  if (typeof valeur === 'string') {
    const parsed = parseNombre(valeur, defaultValue);
    return parsed;
  }

  return defaultValue;
}

/**
 * Extrait un montant depuis un texte
 * Cherche les montants après "à", "pour", "de", "montant", "prix", etc.
 * Supporte les formats: "800000", "800 000", "800k", "1 million"
 * @param text - Texte à analyser
 * @returns Montant extrait ou null si non trouvé
 */
export function extractMontantFromText(text: string): number | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Patterns prioritaires (plus fiables)
  const priorityPatterns = [
    // Pattern 1: Montant après "à", "pour", "de", "montant", "prix", "coût"
    /(?:a|pour|de|montant|prix|cout|vendu a|vendu pour|depense|achete|paye)[:\s]+(\d[\d\s,]{3,})(?:\s*(?:f\s*c\s*f\s*a|fcfa|francs?|f\s*))?/i,
    // Pattern 2: "5000 FCFA", "5 000 francs" (avec devise, minimum 3 chiffres)
    /(\d[\d\s,]{3,})\s*(?:FCFA|CFA|francs?|F\s*)/i,
  ];

  for (const pattern of priorityPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const montantStr = match[1].replace(/[\s,]/g, '');
      const montant = parseInt(montantStr);
      if (!isNaN(montant) && montant > 100) {
        // Ignorer les petits nombres (probablement des quantités)
        return montant;
      }
    }
  }

  // Pattern 3: Formats "k" ou "million" (ex: "800k", "1 million")
  const kPattern = /(\d+[\d\s,]*)\s*k\b/i;
  const kMatch = text.match(kPattern);
  if (kMatch && kMatch[1]) {
    const base = parseMontant(kMatch[1]);
    if (base > 0) {
      return base * 1000;
    }
  }

  const millionPattern = /(\d+[\d\s,.]*)\s*million/i;
  const millionMatch = text.match(millionPattern);
  if (millionMatch && millionMatch[1]) {
    const base = parseMontant(millionMatch[1]);
    if (base > 0) {
      return base * 1000000;
    }
  }

  // Pattern 4: Plus grand nombre dans le texte (fallback)
  const numbers = text.match(/\d[\d\s,]{3,}/g);
  if (numbers && numbers.length > 0) {
    const montants = numbers
      .map((n) => parseInt(n.replace(/[\s,]/g, '')))
      .filter((n) => !isNaN(n) && n > 100);

    if (montants.length > 0) {
      return Math.max(...montants);
    }
  }

  return null;
}
