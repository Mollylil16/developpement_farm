/**
 * Schémas de validation Yup pour le module Stocks
 */

import * as yup from 'yup';
import { validateWithSchema, validateField } from './financeSchemas';

/**
 * Schéma de validation pour un stock aliment
 */
export const stockAlimentSchema = yup.object().shape({
  projet_id: yup.string().required('Le projet est obligatoire'),
  nom: yup
    .string()
    .required('Le nom de l\'aliment est obligatoire')
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  categorie: yup.string().nullable().max(50, 'La catégorie ne peut pas dépasser 50 caractères'),
  quantite_initiale: yup
    .number()
    .required('La quantité initiale est obligatoire')
    .min(0, 'La quantité doit être positive ou nulle')
    .typeError('La quantité doit être un nombre'),
  unite: yup
    .string()
    .required('L\'unité est obligatoire')
    .oneOf(['kg', 'g', 'l', 'ml', 'sac', 'unite'], 'Unité invalide'),
  seuil_alerte: yup
    .number()
    .nullable()
    .min(0, 'Le seuil d\'alerte doit être positif ou nul')
    .typeError('Le seuil d\'alerte doit être un nombre'),
  notes: yup.string().nullable().max(500, 'Les notes ne peuvent pas dépasser 500 caractères'),
});

export type StockAlimentFormData = yup.InferType<typeof stockAlimentSchema>;

// Fonctions de validation réutilisables
export async function validateStockAliment(data: StockAlimentFormData) {
  return validateWithSchema(stockAlimentSchema, data);
}

export async function validateStockAlimentField(
  fieldName: keyof StockAlimentFormData,
  value: unknown,
  allData?: StockAlimentFormData
) {
  return validateField(stockAlimentSchema, fieldName as string, value, allData);
}

