/**
 * Schémas de normalisation pour Redux avec normalizr
 * Améliore les performances en stockant les données sous forme normalisée
 */

import { schema } from 'normalizr';

// Schéma pour les animaux de production
export const animalSchema = new schema.Entity(
  'animaux',
  {},
  {
    idAttribute: 'id',
  }
);

// Schéma pour les pesées
export const peseeSchema = new schema.Entity(
  'pesees',
  {},
  {
    idAttribute: 'id',
  }
);

// Schéma pour les gestations
export const gestationSchema = new schema.Entity(
  'gestations',
  {},
  {
    idAttribute: 'id',
  }
);

// Schéma pour les sevrages
export const sevrageSchema = new schema.Entity(
  'sevrages',
  {},
  {
    idAttribute: 'id',
  }
);

// Schéma pour les mortalités
export const mortaliteSchema = new schema.Entity(
  'mortalites',
  {},
  {
    idAttribute: 'id',
  }
);

// Schéma pour les revenus
export const revenuSchema = new schema.Entity(
  'revenus',
  {},
  {
    idAttribute: 'id',
  }
);

// Schéma pour les dépenses ponctuelles
export const depensePonctuelleSchema = new schema.Entity(
  'depensesPonctuelles',
  {},
  {
    idAttribute: 'id',
  }
);

// Schéma pour les charges fixes
export const chargeFixeSchema = new schema.Entity(
  'chargesFixes',
  {},
  {
    idAttribute: 'id',
  }
);

// Schéma pour les rations
export const rationSchema = new schema.Entity(
  'rations',
  {},
  {
    idAttribute: 'id',
  }
);

// Schémas pour les listes
export const animauxSchema = [animalSchema];
export const peseesSchema = [peseeSchema];
export const gestationsSchema = [gestationSchema];
export const sevragesSchema = [sevrageSchema];
export const mortalitesSchema = [mortaliteSchema];
export const revenusSchema = [revenuSchema];
export const depensesPonctuellesSchema = [depensePonctuelleSchema];
export const chargesFixesSchema = [chargeFixeSchema];
export const rationsSchema = [rationSchema];
