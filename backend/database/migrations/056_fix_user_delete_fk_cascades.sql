-- Migration 056: Corriger les contraintes FK qui empêchent la suppression d'un utilisateur
-- Problème: certaines tables ont "ON DELETE SET NULL" mais des colonnes NOT NULL (ex: transactions.user_id, migration_history.user_id),
-- ce qui fait échouer DELETE FROM users.
-- Solution: basculer ces FKs vers ON DELETE CASCADE pour supprimer toutes les données liées au compte.

-- 1) transactions.user_id -> CASCADE
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2) migration_history.user_id -> CASCADE
ALTER TABLE migration_history
  DROP CONSTRAINT IF EXISTS migration_history_user_id_fkey;
ALTER TABLE migration_history
  ADD CONSTRAINT migration_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 3) veterinarians.user_id -> CASCADE (supprimer la fiche vétérinaire liée au compte)
ALTER TABLE veterinarians
  DROP CONSTRAINT IF EXISTS veterinarians_user_id_fkey;
ALTER TABLE veterinarians
  ADD CONSTRAINT veterinarians_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4) collaborations.user_id -> CASCADE (éviter de conserver des données personnelles dans collaborations)
ALTER TABLE collaborations
  DROP CONSTRAINT IF EXISTS collaborations_user_id_fkey;
ALTER TABLE collaborations
  ADD CONSTRAINT collaborations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


