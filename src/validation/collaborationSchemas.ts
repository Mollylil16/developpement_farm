/**
 * Schémas de validation Yup pour le module Collaboration
 */

import * as yup from 'yup';
import { validateWithSchema, validateField } from './financeSchemas';

/**
 * Schéma de validation pour un collaborateur
 */
export const collaborateurSchema = yup.object().shape({
  projet_id: yup.string().required('Le projet est obligatoire'),
  nom: yup
    .string()
    .required('Le nom est obligatoire')
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),
  prenom: yup
    .string()
    .required('Le prénom est obligatoire')
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères'),
  email: yup
    .string()
    .required('L\'email est obligatoire')
    .email('Format d\'email invalide')
    .max(100, 'L\'email ne peut pas dépasser 100 caractères'),
  telephone: yup
    .string()
    .nullable()
    .matches(/^[+]?[\d\s\-()]+$/, 'Format de téléphone invalide')
    .max(20, 'Le téléphone ne peut pas dépasser 20 caractères'),
  role: yup
    .string()
    .required('Le rôle est obligatoire')
    .oneOf(
      ['proprietaire', 'gestionnaire', 'veterinaire', 'ouvrier', 'observateur'],
      'Rôle invalide'
    ),
  statut: yup
    .string()
    .required('Le statut est obligatoire')
    .oneOf(['actif', 'inactif', 'en_attente'], 'Statut invalide'),
  permissions: yup.object().nullable(),
  notes: yup.string().nullable().max(500, 'Les notes ne peuvent pas dépasser 500 caractères'),
});

export type CollaborateurFormData = yup.InferType<typeof collaborateurSchema>;

// Fonctions de validation réutilisables
export async function validateCollaborateur(data: CollaborateurFormData) {
  return validateWithSchema(collaborateurSchema, data);
}

export async function validateCollaborateurField(
  fieldName: keyof CollaborateurFormData,
  value: unknown,
  allData?: CollaborateurFormData
) {
  return validateField(collaborateurSchema, fieldName as string, value, allData);
}

