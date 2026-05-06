// Utilitaires de validation pour les formulaires
export class ValidationFormulaires {
  /**
   * Valide un formulaire de porc
   */
  static validerPorc(form: any): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!form.numeroIdentification?.trim()) {
      errors.numeroIdentification = 'Le numéro d\'identification est requis';
    } else if (!/^[A-Z0-9]{3,12}$/.test(form.numeroIdentification)) {
      errors.numeroIdentification = 'Format invalide (3-12 caractères alphanumériques)';
    }

    if (!form.race?.trim()) {
      errors.race = 'La race est requise';
    }

    if (!form.poidsActuel || isNaN(parseFloat(form.poidsActuel))) {
      errors.poidsActuel = 'Le poids actuel doit être un nombre valide';
    } else if (parseFloat(form.poidsActuel) <= 0 || parseFloat(form.poidsActuel) > 500) {
      errors.poidsActuel = 'Le poids doit être entre 0 et 500 kg';
    }

    if (!form.poidsCible || isNaN(parseFloat(form.poidsCible))) {
      errors.poidsCible = 'Le poids cible doit être un nombre valide';
    } else if (parseFloat(form.poidsCible) <= 0 || parseFloat(form.poidsCible) > 500) {
      errors.poidsCible = 'Le poids cible doit être entre 0 et 500 kg';
    }

    if (form.poidsActuel && form.poidsCible && parseFloat(form.poidsActuel) > parseFloat(form.poidsCible)) {
      errors.poidsCible = 'Le poids cible doit être supérieur au poids actuel';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Valide un formulaire de gestation
   */
  static validerGestation(form: any): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!form.truieId) {
      errors.truieId = 'La truie est requise';
    }

    if (!form.nombrePorceletsPrevu || isNaN(parseInt(form.nombrePorceletsPrevu))) {
      errors.nombrePorceletsPrevu = 'Le nombre de porcelets doit être un nombre valide';
    } else if (parseInt(form.nombrePorceletsPrevu) <= 0 || parseInt(form.nombrePorceletsPrevu) > 20) {
      errors.nombrePorceletsPrevu = 'Le nombre de porcelets doit être entre 1 et 20';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Valide un formulaire de transaction
   */
  static validerTransaction(form: any): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    if (!form.type) {
      errors.type = 'Le type de transaction est requis';
    }

    if (!form.montant || isNaN(parseFloat(form.montant))) {
      errors.montant = 'Le montant doit être un nombre valide';
    } else if (parseFloat(form.montant) <= 0) {
      errors.montant = 'Le montant doit être positif';
    }

    if (!form.description?.trim()) {
      errors.description = 'La description est requise';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Génère un ID unique pour les entités
   */
  static genererId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Formate les données du formulaire porc pour correspondre au type Porc
   */
  static formaterPorc(form: any): any {
    return {
      id: ValidationFormulaires.genererId(),
      numeroIdentification: form.numeroIdentification.trim().toUpperCase(),
      dateNaissance: new Date(), // Par défaut aujourd'hui, pourrait être modifiable
      sexe: form.sexe,
      race: form.race.trim(),
      poidsActuel: parseFloat(form.poidsActuel),
      poidsCible: parseFloat(form.poidsCible),
      statut: form.statut || 'croissance',
      notes: form.notes?.trim() || undefined,
    };
  }

  /**
   * Formate les données du formulaire gestation pour correspondre au type Gestation
   */
  static formaterGestation(form: any): any {
    const dateSautage = new Date();
    const dateMiseBasPrevue = new Date();
    dateMiseBasPrevue.setDate(dateMiseBasPrevue.getDate() + 114); // 114 jours de gestation

    return {
      id: ValidationFormulaires.genererId(),
      truieId: form.truieId,
      dateSautage,
      dateMiseBasPrevue,
      nombrePorceletsPrevu: parseInt(form.nombrePorceletsPrevu),
      statut: 'en_cours',
      notes: form.notes?.trim() || undefined,
    };
  }

  /**
   * Formate les données du formulaire transaction pour correspondre au type Transaction
   */
  static formaterTransaction(form: any): any {
    return {
      id: ValidationFormulaires.genererId(),
      type: form.type,
      montant: parseFloat(form.montant),
      date: new Date(),
      description: form.description.trim(),
      categorie: form.categorie?.trim() || undefined,
      porcId: form.porcId || undefined,
    };
  }

  /**
   * Valide les données d'une mortalité
   */
  static validerMortalite(donnees: any): Record<string, string> {
    const erreurs: Record<string, string> = {};

    if (!donnees.porcId?.trim()) {
      erreurs.porcId = 'Le porc est requis';
    }

    if (!donnees.dateDeces?.trim()) {
      erreurs.dateDeces = 'La date de décès est requise';
    } else {
      const dateDeces = new Date(donnees.dateDeces);
      if (isNaN(dateDeces.getTime())) {
        erreurs.dateDeces = 'Format de date invalide';
      } else if (dateDeces > new Date()) {
        erreurs.dateDeces = 'La date de décès ne peut pas être dans le futur';
      }
    }

    if (!donnees.causeDeces?.trim()) {
      erreurs.causeDeces = 'La cause de décès est requise';
    }

    if (!donnees.poidsAuDeces?.trim()) {
      erreurs.poidsAuDeces = 'Le poids au décès est requis';
    } else {
      const poids = parseFloat(donnees.poidsAuDeces);
      if (isNaN(poids) || poids <= 0) {
        erreurs.poidsAuDeces = 'Le poids doit être un nombre positif';
      } else if (poids > 500) {
        erreurs.poidsAuDeces = 'Le poids semble trop élevé';
      }
    }

    return erreurs;
  }

  /**
   * Formate les données d'une mortalité
   */
  static formaterMortalite(donnees: any) {
    return {
      porcId: donnees.porcId.trim(),
      dateDeces: new Date(donnees.dateDeces),
      causeDeces: donnees.causeDeces,
      causeDetaillee: donnees.causeDetaillee?.trim() || undefined,
      poidsAuDeces: parseFloat(donnees.poidsAuDeces),
      traitementPrecedent: donnees.traitementPrecedent?.trim() || undefined,
      notes: donnees.notes?.trim() || undefined,
    };
  }
}

/** Validate email format */
export function validateEmail(email: string): { valid: boolean; isValid: boolean; errors: string[]; message?: string } {
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const errors = valid ? [] : ['Veuillez entrer une adresse email valide'];
  return { valid, isValid: valid, errors, message: errors[0] };
}

/** Validate phone number format */
export function validatePhone(phone: string): { valid: boolean; isValid: boolean; errors: string[]; message?: string } {
  const valid = /^\+?[\d\s\-()]{8,15}$/.test(phone);
  const errors = valid ? [] : ['Veuillez entrer un numéro de téléphone valide'];
  return { valid, isValid: valid, errors, message: errors[0] };
}

/** Validate registration data */
export function validateRegisterData(data: {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  password?: string;
}): { valid: boolean; isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data.nom?.trim()) errors.push('Le nom est requis');
  if (!data.prenom?.trim()) errors.push('Le prénom est requis');
  if (data.email && !validateEmail(data.email).valid) errors.push('Email invalide');
  if (data.telephone && !validatePhone(data.telephone).valid) errors.push('Téléphone invalide');
  const valid = errors.length === 0;
  return { valid, isValid: valid, errors };
}
