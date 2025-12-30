# Procédure: Reproduction — `get_gestations`, `get_gestation_by_truie`, `predict_mise_bas`, `get_porcelets`, `get_porcelets_transition`

**Catégorie:** `procedures`  
**Mots-clés:** reproduction, get_gestations, get_gestation_by_truie, predict_mise_bas, get_porcelets, get_porcelets_transition, procédure, gestation, truie, mise bas, porcelets, sevrage, transition, ui_target, champ obligatoire

---

## Chunk 1 — `get_gestations`

**intent:** `get_gestations`  
**domain:** `reproduction`  
**ui_target:** `Menu Reproduction > Gestations`  
**required_fields:** `projet_id (depuis contexte)`  
**optional_fields:** `en_cours (défaut true)`

Procédure:
1) Charger les gestations du projet.
2) Filtrer `en_cours` si demandé.
3) Répondre avec liste + prochaines mises bas.

---

## Chunk 2 — `get_gestation_by_truie`

**intent:** `get_gestation_by_truie`  
**domain:** `reproduction`  
**ui_target:** `Menu Reproduction > Truies`  
**required_fields:** `truie_id (code/nom/id)`

Procédure:
1) Identifier la truie (code/nom).
2) Récupérer son statut de gestation.
3) Répondre avec date saillie + état.

---

## Chunk 3 — `predict_mise_bas`

**intent:** `predict_mise_bas`  
**domain:** `reproduction`  
**ui_target:** `Menu Reproduction > Prédiction mise bas`  
**required_fields:** `truie_id (code/nom/id)`

Procédure:
1) Récupérer date de saillie/saute.
2) Calculer mise bas = date_saillie + 114 jours.
3) Répondre + rappel conseillé.

---

## Chunk 4 — `get_porcelets`

**intent:** `get_porcelets`  
**domain:** `reproduction`  
**ui_target:** `Menu Reproduction > Porcelets`  
**required_fields:** `projet_id (depuis contexte)`  
**optional_fields:** `jours (défaut 30)`

Procédure:
1) Charger les naissances/porcelets.
2) Filtrer sur N jours.
3) Répondre avec effectif + alertes.

---

## Chunk 5 — `get_porcelets_transition`

**intent:** `get_porcelets_transition`  
**domain:** `reproduction`  
**ui_target:** `Menu Reproduction > Transition`  
**required_fields:** `projet_id (depuis contexte)`

Procédure:
1) Identifier porcelets 18-28 jours (transition sevrage→croissance).
2) Répondre avec liste + recommandations.


