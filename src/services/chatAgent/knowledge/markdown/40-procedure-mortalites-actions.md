# Procédure: Mortalités — `get_mortalites`, `get_taux_mortalite`, `analyze_causes_mortalite`

**Catégorie:** `procedures`  
**Mots-clés:** mortalité, mortalites, get_mortalites, get_taux_mortalite, analyze_causes_mortalite, procédure, décès, morts, causes mortalité, taux mortalité, période, ui_target

---

## Chunk 1 — `get_mortalites`

**intent:** `get_mortalites`  
**domain:** `mortalite`  
**ui_target:** `Menu Mortalités`  
**required_fields:** `projet_id (depuis contexte)`  
**optional_fields:** `jours (défaut 90)`

Procédure:
1) Charger les mortalités du projet.
2) Filtrer sur N jours.
3) Répondre avec liste + total.

---

## Chunk 2 — `get_taux_mortalite`

**intent:** `get_taux_mortalite`  
**domain:** `mortalite`  
**ui_target:** `Menu Mortalités > Statistiques`  
**required_fields:** `projet_id (depuis contexte)`  
**optional_fields:** `periode (7j|30j|90j|1an, défaut 30j)`

Procédure:
1) Déterminer la période.
2) Calculer taux = décès / effectif sur période (selon définition app).
3) Répondre avec taux + comparaison période précédente si dispo.

---

## Chunk 3 — `analyze_causes_mortalite`

**intent:** `analyze_causes_mortalite`  
**domain:** `mortalite`  
**ui_target:** `Menu Mortalités > Analyse`  
**required_fields:** `projet_id (depuis contexte)`

Procédure:
1) Agréger mortalités par cause.
2) Sortir top causes + recommandations.


