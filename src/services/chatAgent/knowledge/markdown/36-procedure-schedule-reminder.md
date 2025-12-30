# Procédure: `schedule_reminder` — Programmer un rappel

**Catégorie:** `procedures`  
**Mots-clés:** schedule_reminder, procédure schedule_reminder, programmer rappel, rappelle-moi, n'oublie pas, tâche, date, ui_target

---

**intent:** `schedule_reminder`  
**domain:** `info`  
**ui_target:** `Menu Planning / Rappels`  
**required_fields:** `titre, date_prevue`  
**optional_fields:** `description, type`

---

## Procédure

1) Extraire `titre` (obligatoire).  
2) Extraire `date_prevue` (obligatoire, YYYY-MM-DD).  
3) Type par défaut `autre` si non fourni.  
4) Créer le rappel côté backend.  
5) UI sync: rafraîchir la liste des tâches/rappels.


