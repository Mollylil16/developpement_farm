/**
 * Utilitaires de validation côté frontend
 * Valide les données avant l'envoi à l'API
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Valide un email
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || !email.trim()) {
    errors.push("L'email est requis");
    return { isValid: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    errors.push("Format d'email invalide");
  }

  if (email.length > 255) {
    errors.push("L'email ne peut pas dépasser 255 caractères");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valide un numéro de téléphone
 */
export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];

  if (!phone || !phone.trim()) {
    errors.push('Le numéro de téléphone est requis');
    return { isValid: false, errors };
  }

  const cleanPhone = phone.replace(/\s+/g, '');
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;

  if (!phoneRegex.test(cleanPhone)) {
    errors.push('Format de numéro de téléphone invalide');
  }

  if (cleanPhone.length < 8 || cleanPhone.length > 15) {
    errors.push('Le numéro de téléphone doit contenir entre 8 et 15 chiffres');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valide un mot de passe
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password || !password.trim()) {
    errors.push('Le mot de passe est requis');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }

  if (password.length > 100) {
    errors.push('Le mot de passe ne peut pas dépasser 100 caractères');
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valide un nom ou prénom
 */
export function validateName(name: string, fieldName: string = 'Nom'): ValidationResult {
  const errors: string[] = [];

  if (!name || !name.trim()) {
    errors.push(`${fieldName} est requis`);
    return { isValid: false, errors };
  }

  if (name.trim().length < 2) {
    errors.push(`${fieldName} doit contenir au moins 2 caractères`);
  }

  if (name.length > 100) {
    errors.push(`${fieldName} ne peut pas dépasser 100 caractères`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Valide les données d'inscription
 */
export function validateRegisterData(data: {
  email?: string;
  telephone?: string;
  nom: string;
  prenom: string;
  password?: string;
}): ValidationResult {
  const errors: string[] = [];

  // Au moins email ou téléphone
  if (!data.email && !data.telephone) {
    errors.push('Un email ou un numéro de téléphone est requis');
  }

  // Valider email si fourni
  if (data.email) {
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }

    // Si email fourni, password requis
    if (data.email && !data.password) {
      errors.push("Un mot de passe est requis pour l'inscription par email");
    }
  }

  // Valider téléphone si fourni
  if (data.telephone) {
    const phoneValidation = validatePhone(data.telephone);
    if (!phoneValidation.isValid) {
      errors.push(...phoneValidation.errors);
    }
  }

  // Valider mot de passe si fourni
  if (data.password) {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }
  }

  // Valider nom
  const nomValidation = validateName(data.nom, 'Le nom');
  if (!nomValidation.isValid) {
    errors.push(...nomValidation.errors);
  }

  // Valider prénom
  const prenomValidation = validateName(data.prenom, 'Le prénom');
  if (!prenomValidation.isValid) {
    errors.push(...prenomValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
