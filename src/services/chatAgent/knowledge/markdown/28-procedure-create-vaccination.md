# Procédure: `create_vaccination` — Enregistrer une vaccination

**Catégorie:** `procedures`  
**Mots-clés:** create_vaccination, procédure create_vaccination, vaccination, vacciner, vaccin, date_vaccination, date_rappel, animal_id, lot_id, champ obligatoire, required_fields, ui_target, sante

---

**intent:** `create_vaccination`  
**domain:** `sante`  
**ui_target:** `Menu Santé > Vaccinations`  
**required_fields:** `projet_id (depuis contexte), vaccin`  
**optional_fields:** `animal_id | animal_ids | lot_id, date_vaccination, date_rappel`

---

## Procédure

1) Identifier l’animal / lot (si nécessaire).  
2) Extraire `vaccin` (obligatoire).  
3) `date_vaccination`: défaut aujourd’hui.  
4) `date_rappel`: optionnel (peut être calculé selon protocole).  
5) Appeler l’API backend vaccination.  
6) UI sync: rafraîchir les vaccinations.


