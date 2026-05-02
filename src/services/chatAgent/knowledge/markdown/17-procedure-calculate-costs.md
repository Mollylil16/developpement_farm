# Procédure: `calculate_costs` — Calcul des coûts / dépenses (information)

**Catégorie:** `procedures`  
**Mots-clés:** calculate_costs, procédure calculate_costs, coûts, couts, dépenses totales, budget, période, date_debut, date_fin, ui_target, finance

---

**intent:** `calculate_costs`  
**domain:** `finance`  
**ui_target:** `Menu Finances / Statistiques`  
**required_fields:** `projet_id (depuis contexte)`  
**optional_fields:** `date_debut, date_fin`

---

## Procédure

1) Identifier la période:
- si `date_debut/date_fin` absents: utiliser une période par défaut (ex: mois en cours) selon l’app.
2) Récupérer les dépenses et/ou stats via l’API backend.
3) Répondre: total dépenses + ventilation par catégories si disponible.

---

## Exemples

- “mes dépenses ce mois” → `calculate_costs` + période mois courant
- “combien j’ai dépensé entre 01/12 et 31/12” → `calculate_costs` + dates


