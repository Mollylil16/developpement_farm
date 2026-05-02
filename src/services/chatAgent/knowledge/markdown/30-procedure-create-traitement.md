# Procédure: `create_traitement` — Enregistrer un traitement

**Catégorie:** `procedures`  
**Mots-clés:** create_traitement, procédure create_traitement, traitement, médicament, soigner, duree_jours, date_debut, date_fin, animal_id, lot_id, ui_target, sante, champ obligatoire

---

**intent:** `create_traitement`  
**domain:** `sante`  
**ui_target:** `Menu Santé > Traitements`  
**required_fields:** `projet_id (depuis contexte), nom_medicament`  
**optional_fields:** `animal_id | lot_id, date_debut, date_fin, duree_jours, notes`

---

## Procédure

1) Identifier l’animal ou le lot si nécessaire.  
2) Extraire `nom_medicament` (obligatoire).  
3) `date_debut`: défaut aujourd’hui.  
4) `duree_jours` et/ou `date_fin` optionnels.  
5) Appeler l’API backend.  
6) UI sync: rafraîchir la liste des traitements.


