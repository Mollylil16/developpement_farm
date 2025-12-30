# Procédure: `create_planification` — Créer une tâche / planification

**Catégorie:** `procedures`  
**Mots-clés:** create_planification, procédure create_planification, planification, tâche, calendrier, date_prevue, ui_target, champ obligatoire

---

**intent:** `create_planification`  
**domain:** `info`  
**ui_target:** `Menu Planning / Planification`  
**required_fields:** `titre, date_prevue`  
**optional_fields:** `type (veterinaire|autre), description`

---

## Procédure

1) Extraire `titre` (obligatoire).  
2) Extraire `date_prevue` (obligatoire, YYYY-MM-DD).  
3) `type` par défaut `autre`.  
4) Appeler l’API backend planification.  
5) UI sync: rafraîchir l’écran Planification.


