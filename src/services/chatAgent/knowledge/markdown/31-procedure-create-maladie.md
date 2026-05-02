# Procédure: `create_maladie` — Enregistrer une maladie

**Catégorie:** `procedures`  
**Mots-clés:** create_maladie, procédure create_maladie, maladie, porc malade, symptomes, gravite, date_debut, animal_id, lot_id, ui_target, sante, champ obligatoire

---

**intent:** `create_maladie`  
**domain:** `sante`  
**ui_target:** `Menu Santé > Maladies`  
**required_fields:** `projet_id (depuis contexte), nom_maladie`  
**optional_fields:** `animal_id | lot_id, symptomes, gravite, date_debut`
**enum_values.gravite:** `faible | moyenne | elevee`

---

## Procédure

1) Identifier l’animal ou le lot si nécessaire.  
2) Extraire `nom_maladie` (obligatoire).  
3) `gravite`: défaut `moyenne`.  
4) `date_debut`: défaut aujourd’hui.  
5) Appeler l’API backend.  
6) UI sync: rafraîchir la liste des maladies.


