/**
 * Schémas de validation Yup pour le module Collaboration
 */

import * as yup from 'yup';
import { validateWithSchema, validateField } from './financeSchemas';

/**
 * Schéma de validation pour un collaborateur
 * 
 * NOTE: Utilise une validation au niveau de l'objet pour éviter la dépendance circulaire
 * entre email et telephone (qui causait "Cyclic dependency, node was: telephone")
 */
export const collaborateurSchema = yup
  .object()
  .shape({
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
    // Email et telephone sont optionnels individuellement, mais au moins un est requis
    // On évite .when() mutuel pour éviter la dépendance circulaire
    email: yup
      .string()
      .nullable()
      .transform((value) => (value === '' ? null : value))
      .test(
        'email-format-if-provided',
        "Format d'email invalide",
        function (value) {
          // Si l'email est vide ou null, c'est OK (validation gérée par email-or-telephone)
          if (!value || value.trim().length === 0) {
            return true;
          }
          // Si l'email contient un @, valider le format email
          if (value.includes('@')) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          }
          // Si l'email ne contient pas de @, c'est probablement un téléphone dans le mauvais champ
          // On retourne false pour forcer l'utilisateur à utiliser le bon champ
          return false;
        }
      )
      .max(100, "L'email ne peut pas dépasser 100 caractères"),
    telephone: yup
      .string()
      .nullable()
      .transform((value) => (value === '' ? null : value))
      .matches(/^[+]?[\d\s\-()]*$/, 'Format de téléphone invalide')
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
  })
  .test(
    'email-or-telephone',
    "L'email ou le téléphone est obligatoire",
    function (value) {
      const email = value?.email;
      const telephone = value?.telephone;
      const hasEmail = email && email.trim().length > 0;
      const hasTelephone = telephone && telephone.trim().length > 0;
      return hasEmail || hasTelephone;
    }
  )
  // Ce test est maintenant géré directement dans le schéma email ci-dessus
  .test(
    'telephone-format-if-provided',
    'Format de téléphone invalide',
    function (value) {
      const telephone = value?.telephone;
      if (!telephone || telephone.trim().length === 0) {
        return true; // Téléphone vide = OK (validation gérée par email-or-telephone)
      }
      // Validation du format téléphone
      return /^[+]?[\d\s\-()]+$/.test(telephone);
    }
  );

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
