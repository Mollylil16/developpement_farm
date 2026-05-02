# Procédure: `get_reminders` — Rappels & tâches à venir

**Catégorie:** `procedures`  
**Mots-clés:** get_reminders, procédure get_reminders, rappels, à faire, tâches, calendrier, vaccination à venir, traitement à venir, ui_target

---

**intent:** `get_reminders`  
**domain:** `info`  
**ui_target:** `Chat Kouakou + écran Rappels`  
**required_fields:** `projet_id (depuis contexte)`

---

## Procédure

1) Récupérer les éléments planifiés (vaccinations, traitements, visites, tâches) pour le projet.  
2) Filtrer les prochaines échéances (ex: 7 jours).  
3) Répondre sous forme de liste priorisée.


