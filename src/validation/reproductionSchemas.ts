/**
 * Schémas de validation Yup pour le module Reproduction
 */

import * as yup from 'yup';
import { validateWithSchema, validateField } from './financeSchemas';

/**
 * Schéma de validation pour une gestation
 */
export const gestationSchema = yup.object().shape({
  projet_id: yup.string().required('Le projet est obligatoire'),
  truie_id: yup.string().required('La truie est obligatoire'),
  truie_nom: yup.string().nullable(),
  verrat_id: yup.string().required('Le verrat est obligatoire'),
  verrat_nom: yup.string().nullable(),
  date_sautage: yup
    .string()
    .required('La date de sautage est obligatoire')
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  nombre_porcelets_prevu: yup
    .number()
    .required('Le nombre de porcelets prévu est obligatoire')
    .min(0, 'Le nombre de porcelets doit être positif')
    .max(30, 'Le nombre de porcelets ne peut pas dépasser 30')
    .integer('Le nombre de porcelets doit être un entier'),
  notes: yup.string().nullable().max(1000, 'Les notes ne peuvent pas dépasser 1000 caractères'),
});

export type GestationFormData = yup.InferType<typeof gestationSchema>;

// Fonctions de validation réutilisables
export async function validateGestation(data: GestationFormData) {
  return validateWithSchema(gestationSchema, data);
}

export async function validateGestationField(
  fieldName: keyof GestationFormData,
  value: unknown,
  allData?: GestationFormData
) {
  return validateField(gestationSchema, fieldName as string, value, allData);
}

