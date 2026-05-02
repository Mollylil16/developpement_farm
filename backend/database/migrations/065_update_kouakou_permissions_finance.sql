-- Migration 065: Mise à jour des permissions finance pour le collaborateur Kouakou
-- Active l'accès complet au module finance (lecture, création, modification, suppression) pour Kouakou
-- Cela inclut l'accès au menu Dettes nouvellement créé

-- Mettre à jour les permissions finance pour tous les collaborateurs nommés "Kouakou"
-- Note: Cette requête met à jour tous les collaborateurs avec nom ou prénom contenant "Kouakou"
-- Pour plus de précision, vous pouvez utiliser l'email ou l'ID spécifique du collaborateur

UPDATE collaborations
SET 
  permission_finance = TRUE,
  derniere_modification = CURRENT_TIMESTAMP
WHERE 
  (LOWER(nom) LIKE '%kouakou%' OR LOWER(prenom) LIKE '%kouakou%')
  AND permission_finance = FALSE;

-- Alternative: Si vous connaissez l'ID spécifique du collaborateur Kouakou, utilisez cette requête à la place:
-- UPDATE collaborations
-- SET 
--   permission_finance = TRUE,
--   derniere_modification = CURRENT_TIMESTAMP
-- WHERE 
--   id = 'ID_DU_COLLABORATEUR_KOuakou';

-- Commentaire pour documentation
COMMENT ON COLUMN collaborations.permission_finance IS 'Permission d''accès au module finance (dépenses, revenus, charges fixes, dettes, bilan). TRUE = accès complet (lecture, création, modification, suppression)';

