/**
 * Export centralisé de toutes les migrations
 * Les migrations sont triées par version (ordre d'exécution)
 */

import type { Migration } from './MigrationRunner';

// Importer toutes les migrations
import { addSavedFarmsToUsers } from './add_saved_farms_to_users';
import { addTelephoneToUsers } from './002_add_telephone_to_users';
import { makeEmailTelephoneOptional } from './003_make_email_telephone_optional';
import { addMultiRoleFields } from './004_add_multi_role_fields';
import { addProjetIdToRations } from './005_add_projet_id_to_rations';
import { addStatutToProductionAnimaux } from './006_add_statut_to_production_animaux';
import { addUserIdToCollaborations } from './007_add_user_id_to_collaborations';
import { addRaceToProductionAnimaux } from './008_add_race_to_production_animaux';
import { addPrixKgToProjets } from './009_add_prix_kg_to_projets';
import { addReproducteurFields } from './010_add_reproducteur_fields';
import { addVerratFieldsToGestations } from './011_add_verrat_fields_to_gestations';
import { addProjetIdToGestations } from './012_add_projet_id_to_gestations';
import { addAnimalCodeToMortalites } from './013_add_animal_code_to_mortalites';
import { addProjetIdToSevrages } from './014_add_projet_id_to_sevrages';
import { addProjetIdToDepenses } from './015_add_projet_id_to_depenses';
import { addProjetIdToChargesFixes } from './016_add_projet_id_to_charges_fixes';
import { addAnimalIdToRevenus } from './017_add_animal_id_to_revenus';
import { addPoidsKgToRevenus } from './018_add_poids_kg_to_revenus';
import { addDerniereModificationFields } from './019_add_derniere_modification_fields';
import { addMargeFieldsToRevenus } from './020_add_marge_fields_to_revenus';
import { syncActifStatut } from './021_sync_actif_statut';
import { updateIngredientsUnit } from './022_update_ingredients_unit';
import { recalculateGmq } from './023_recalculate_gmq';
import { addPermissionSanteToCollaborations } from './024_add_permission_sante_to_collaborations';
import { createMarketplaceAdditionalTables } from './025_create_marketplace_additional_tables';
import { fixVaccinationsTableConstraint } from './026_fix_vaccinations_table_constraint';
import { addDureeAmortissementToProjets } from './027_add_duree_amortissement_to_projets';
import { createMarketplaceTables } from './create_marketplace_tables';
import { updateDepensesPonctuellesCategorieCheck } from './029_update_depenses_ponctuelles_categorie_check';
import { createVeterinariansTableMigration } from './030_create_veterinarians_table';
import { addCategoriePoidsAndNombreCroissance } from './032_add_categorie_poids_and_nombre_croissance';
import { createChatAgentTables } from './033_create_chat_agent_tables';
import { addManagementMethodToProjets } from './034_add_management_method_to_projets';
import { createBatchesTable } from './035_create_batches_table';

/**
 * Liste de toutes les migrations dans l'ordre d'exécution
 * Version = numéro séquentiel (1, 2, 3, ...)
 */
export const migrations: Migration[] = [
  {
    version: 1,
    name: 'add_saved_farms_to_users',
    up: addSavedFarmsToUsers,
  },
  {
    version: 2,
    name: 'add_telephone_to_users',
    up: addTelephoneToUsers,
  },
  {
    version: 3,
    name: 'make_email_telephone_optional',
    up: makeEmailTelephoneOptional,
  },
  {
    version: 4,
    name: 'add_multi_role_fields',
    up: addMultiRoleFields,
  },
  {
    version: 5,
    name: 'add_projet_id_to_rations',
    up: addProjetIdToRations,
  },
  {
    version: 6,
    name: 'add_statut_to_production_animaux',
    up: addStatutToProductionAnimaux,
  },
  {
    version: 7,
    name: 'add_user_id_to_collaborations',
    up: addUserIdToCollaborations,
  },
  {
    version: 8,
    name: 'add_race_to_production_animaux',
    up: addRaceToProductionAnimaux,
  },
  {
    version: 9,
    name: 'add_prix_kg_to_projets',
    up: addPrixKgToProjets,
  },
  {
    version: 10,
    name: 'add_reproducteur_fields',
    up: addReproducteurFields,
  },
  {
    version: 11,
    name: 'add_verrat_fields_to_gestations',
    up: addVerratFieldsToGestations,
  },
  {
    version: 12,
    name: 'add_projet_id_to_gestations',
    up: addProjetIdToGestations,
  },
  {
    version: 13,
    name: 'add_animal_code_to_mortalites',
    up: addAnimalCodeToMortalites,
  },
  {
    version: 14,
    name: 'add_projet_id_to_sevrages',
    up: addProjetIdToSevrages,
  },
  {
    version: 15,
    name: 'add_projet_id_to_depenses',
    up: addProjetIdToDepenses,
  },
  {
    version: 16,
    name: 'add_projet_id_to_charges_fixes',
    up: addProjetIdToChargesFixes,
  },
  {
    version: 17,
    name: 'add_animal_id_to_revenus',
    up: addAnimalIdToRevenus,
  },
  {
    version: 18,
    name: 'add_poids_kg_to_revenus',
    up: addPoidsKgToRevenus,
  },
  {
    version: 19,
    name: 'add_derniere_modification_fields',
    up: addDerniereModificationFields,
  },
  {
    version: 20,
    name: 'add_marge_fields_to_revenus',
    up: addMargeFieldsToRevenus,
  },
  {
    version: 21,
    name: 'sync_actif_statut',
    up: syncActifStatut,
  },
  {
    version: 22,
    name: 'update_ingredients_unit',
    up: updateIngredientsUnit,
  },
  {
    version: 23,
    name: 'recalculate_gmq',
    up: recalculateGmq,
  },
  {
    version: 24,
    name: 'add_permission_sante_to_collaborations',
    up: addPermissionSanteToCollaborations,
  },
  {
    version: 25,
    name: 'create_marketplace_additional_tables',
    up: createMarketplaceAdditionalTables,
  },
  {
    version: 26,
    name: 'fix_vaccinations_table_constraint',
    up: fixVaccinationsTableConstraint,
  },
  {
    version: 27,
    name: 'add_duree_amortissement_to_projets',
    up: addDureeAmortissementToProjets,
  },
  {
    version: 28,
    name: 'create_marketplace_tables',
    up: createMarketplaceTables,
  },
  {
    version: 29,
    name: 'update_depenses_ponctuelles_categorie_check',
    up: updateDepensesPonctuellesCategorieCheck,
  },
  {
    version: 30,
    name: 'create_veterinarians_table',
    up: createVeterinariansTableMigration,
  },
  {
    version: 32,
    name: 'add_categorie_poids_and_nombre_croissance',
    up: addCategoriePoidsAndNombreCroissance,
  },
  {
    version: 33,
    name: 'create_chat_agent_tables',
    up: createChatAgentTables,
  },
  {
    version: 34,
    name: 'add_management_method_to_projets',
    up: addManagementMethodToProjets,
  },
  {
    version: 35,
    name: 'create_batches_table',
    up: createBatchesTable,
  },
];
