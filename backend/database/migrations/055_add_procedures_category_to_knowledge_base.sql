-- Migration 055: Ajouter la catégorie 'procedures' à knowledge_base
-- Permet d'importer les pages "procédure-*" optimisées pour RAG-GATE.

DO $$
BEGIN
  -- Le nom généré par PostgreSQL pour la contrainte inline CHECK est généralement:
  -- knowledge_base_category_check
  -- On la remplace par une version incluant 'procedures'.
  ALTER TABLE knowledge_base DROP CONSTRAINT IF EXISTS knowledge_base_category_check;

  ALTER TABLE knowledge_base
    ADD CONSTRAINT knowledge_base_category_check CHECK (category IN (
      'types_elevage',
      'objectifs',
      'races',
      'emplacement',
      'eau',
      'alimentation',
      'sante',
      'finance',
      'commerce',
      'reglementation',
      'general',
      'procedures'
    ));
END $$;


