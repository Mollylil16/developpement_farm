/**
 * Schémas de validation pour les formulaires Finance
 * Utilise Yup pour une validation robuste des inputs utilisateur
 */

import * as yup from 'yup';

/**
 * Schéma de validation pour les revenus
 */
export const revenuSchema = yup.object().shape({
  montant: yup
    .number()
    .typeError('Le montant doit être un nombre')
    .required('Le montant est obligatoire')
    .positive('Le montant doit être positif')
    .max(1000000000, 'Le montant ne peut pas dépasser 1 milliard de FCFA'),

  categorie: yup
    .string()
    .required('La catégorie est obligatoire')
    .oneOf(['vente_porc', 'vente_porcelets', 'autre'], 'Catégorie invalide'),

  date: yup.string().required('La date est obligatoire'),

  poids_kg: yup
    .number()
    .typeError('Le poids doit être un nombre')
    .nullable()
    .positive('Le poids doit être positif')
    .max(10000, 'Le poids ne peut pas dépasser 10 tonnes'),

  commentaire: yup
    .string()
    .max(500, 'Le commentaire ne peut pas dépasser 500 caractères')
    .nullable(),
});

/**
 * Schéma de validation pour les dépenses ponctuelles
 */
export const depenseSchema = yup.object().shape({
  montant: yup
    .number()
    .typeError('Le montant doit être un nombre')
    .required('Le montant est obligatoire')
    .positive('Le montant doit être positif')
    .max(1000000000, 'Le montant ne peut pas dépasser 1 milliard de FCFA'),

  categorie: yup
    .string()
    .required('La catégorie est obligatoire')
    .oneOf(
      ['aliment', 'medicament', 'main_oeuvre', 'batiment', 'materiel', 'autre'],
      'Catégorie invalide'
    ),

  libelle_categorie: yup
    .string()
    .nullable()
    .when('categorie', {
      is: 'autre',
      then: (schema) =>
        schema
          .required('Le libellé de la catégorie est obligatoire')
          .min(3, 'Le libellé doit contenir au moins 3 caractères')
          .max(100, 'Le libellé ne peut pas dépasser 100 caractères'),
      otherwise: (schema) => schema.nullable(),
    }),

  type_depense: yup
    .string()
    .required('Le type de dépense est obligatoire')
    .oneOf(['OPEX', 'CAPEX'], 'Le type doit être OPEX ou CAPEX'),

  date: yup.string().required('La date est obligatoire'),

  duree_amortissement_mois: yup
    .number()
    .typeError('La durée doit être un nombre')
    .nullable()
    .when('type_depense', {
      is: 'CAPEX',
      then: (schema) =>
        schema
          .required("La durée d'amortissement est obligatoire pour les CAPEX")
          .positive('La durée doit être positive')
          .integer('La durée doit être un nombre entier')
          .max(360, 'La durée ne peut pas dépasser 360 mois (30 ans)'),
      otherwise: (schema) => schema.nullable(),
    }),

  commentaire: yup
    .string()
    .max(500, 'Le commentaire ne peut pas dépasser 500 caractères')
    .nullable(),
});

/**
 * Schéma de validation pour les charges fixes
 */
export const chargeFixeSchema = yup.object().shape({
  nom: yup
    .string()
    .required('Le nom est obligatoire')
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),

  montant_mensuel: yup
    .number()
    .typeError('Le montant doit être un nombre')
    .required('Le montant mensuel est obligatoire')
    .positive('Le montant doit être positif')
    .max(100000000, 'Le montant ne peut pas dépasser 100 millions de FCFA'),

  categorie: yup.string().required('La catégorie est obligatoire'),

  date_debut: yup.string().required('La date de début est obligatoire'),

  date_fin: yup
    .string()
    .nullable()
    .test(
      'date-fin-after-debut',
      'La date de fin doit être après la date de début',
      function (value) {
        const { date_debut } = this.parent;
        if (!value || !date_debut) return true;
        return new Date(value) > new Date(date_debut);
      }
    ),

  description: yup
    .string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .nullable(),
});

/**
 * Helper pour valider un objet avec un schéma
 * Retourne { isValid: boolean, errors: Record<string, string> }
 */
export async function validateWithSchema<T extends yup.AnyObject>(
  schema: yup.ObjectSchema<T>,
  data: T
): Promise<{ isValid: boolean; errors: Record<string, string> }> {
  try {
    await schema.validate(data, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      const errors: Record<string, string> = {};
      err.inner.forEach((error) => {
        if (error.path) {
          errors[error.path] = error.message;
        }
      });
      return { isValid: false, errors };
    }
    throw err;
  }
}

/**
 * Helper pour valider un champ individuel
 */
export async function validateField<T extends yup.AnyObject>(
  schema: yup.ObjectSchema<T>,
  fieldName: string,
  value: unknown,
  allData?: Partial<T>
): Promise<string | null> {
  try {
    const base =
      allData && typeof allData === 'object'
        ? (allData as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    await schema.validateAt(fieldName, { ...base, [fieldName]: value } as unknown as T);
    return null;
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      return err.message;
    }
    return 'Erreur de validation';
  }
}
