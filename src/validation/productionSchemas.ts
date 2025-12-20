/**
 * Schémas de validation pour les formulaires Production
 */

import * as yup from 'yup';

/**
 * Schéma de validation pour les animaux
 */
export const animalSchema = yup.object().shape({
  code: yup
    .string()
    .required('Le code est obligatoire')
    .min(1, 'Le code doit contenir au moins 1 caractère')
    .max(50, 'Le code ne peut pas dépasser 50 caractères')
    .matches(
      /^[A-Z0-9-]+$/,
      'Le code ne peut contenir que des lettres majuscules, chiffres et tirets'
    ),

  nom: yup.string().max(100, 'Le nom ne peut pas dépasser 100 caractères').nullable(),

  sexe: yup
    .string()
    .required('Le sexe est obligatoire')
    .oneOf(['male', 'femelle'], 'Le sexe doit être male ou femelle'),

  race: yup
    .string()
    .required('La race est obligatoire')
    .min(2, 'La race doit contenir au moins 2 caractères'),

  date_naissance: yup
    .string()
    .required('La date de naissance est obligatoire')
    .test('not-future', 'La date de naissance ne peut pas être dans le futur', (value) => {
      if (!value) return true;
      return new Date(value) <= new Date();
    }),

  date_acquisition: yup
    .string()
    .required("La date d'acquisition est obligatoire")
    .test('not-future', "La date d'acquisition ne peut pas être dans le futur", (value) => {
      if (!value) return true;
      return new Date(value) <= new Date();
    })
    .test(
      'after-birth',
      "La date d'acquisition doit être après la date de naissance",
      function (value) {
        const { date_naissance } = this.parent;
        if (!value || !date_naissance) return true;
        return new Date(value) >= new Date(date_naissance);
      }
    ),

  poids_actuel: yup
    .number()
    .typeError('Le poids doit être un nombre')
    .nullable()
    .positive('Le poids doit être positif')
    .max(1000, 'Le poids ne peut pas dépasser 1000 kg'),

  prix_achat: yup
    .number()
    .typeError('Le prix doit être un nombre')
    .nullable()
    .positive('Le prix doit être positif')
    .max(10000000, 'Le prix ne peut pas dépasser 10 millions de FCFA'),

  statut: yup.string().nullable().oneOf(['actif', 'vendu', 'mort', null], 'Statut invalide'),
});

/**
 * Schéma de validation pour les pesées
 */
export const peseeSchema = yup.object().shape({
  animal_id: yup.string().required("L'animal est obligatoire"),

  poids: yup
    .number()
    .typeError('Le poids doit être un nombre')
    .required('Le poids est obligatoire')
    .positive('Le poids doit être positif')
    .max(1000, 'Le poids ne peut pas dépasser 1000 kg')
    .min(0.1, 'Le poids doit être au moins 0.1 kg'),

  date: yup
    .string()
    .required('La date est obligatoire')
    .test('not-future', 'La date ne peut pas être dans le futur', (value) => {
      if (!value) return true;
      return new Date(value) <= new Date();
    }),

  commentaire: yup
    .string()
    .max(500, 'Le commentaire ne peut pas dépasser 500 caractères')
    .nullable(),
});

/**
 * Schéma de validation pour les mortalités
 */
export const mortaliteSchema = yup.object().shape({
  categorie: yup
    .string()
    .required('La catégorie est obligatoire')
    .oneOf(['truie', 'verrat', 'porcelet', 'autre'], 'Catégorie invalide'),

  nombre_porcs: yup
    .number()
    .typeError('Le nombre doit être un nombre')
    .required('Le nombre de porcs est obligatoire')
    .positive('Le nombre doit être positif')
    .integer('Le nombre doit être un entier')
    .max(1000, 'Le nombre ne peut pas dépasser 1000'),

  date: yup
    .string()
    .required('La date est obligatoire')
    .test('not-future', 'La date ne peut pas être dans le futur', (value) => {
      if (!value) return true;
      return new Date(value) <= new Date();
    }),

  cause: yup.string().nullable().max(200, 'La cause ne peut pas dépasser 200 caractères'),

  description: yup
    .string()
    .nullable()
    .max(500, 'La description ne peut pas dépasser 500 caractères'),
});

export { validateWithSchema, validateField } from './financeSchemas';
