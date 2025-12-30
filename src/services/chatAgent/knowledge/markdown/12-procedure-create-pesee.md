# Procédure: `create_pesee` — Enregistrer une pesée

**Catégorie:** `procedures`  
**Mots-clés:** create_pesee, procédure create_pesee, pesee, pesée, peser, poids, poids_kg, animal_code, animal_id, champ obligatoire, required_fields, enum_values, ui_target, production, POST /production/pesees, GET /production/animaux

---

**intent:** `create_pesee`  
**domain:** `production`  
**ui_target:** `Menu Production > Animaux > Pesées (ou fiche animal)`  
**required_fields:** `projet_id, animal_id (ou animal_code), poids_kg, date`  
**endpoint (backend):** `POST /production/pesees`  
**lookup (si animal_code):** `GET /production/animaux?projet_id=...`

---

## Objectif

Enregistrer une pesée pour un animal et la rendre visible dans les écrans de production.

---

## Règle RAG-GATE (obligatoire)

Avant d’exécuter, Kouakou doit vérifier dans la base de connaissances :
- le format des champs (`poids_kg`, `date`)
- la résolution de l’animal (`animal_code` → `animal_id`)
- les validations (poids > 0)

---

## Procédure (1 intention = 1 chunk)

1) **Identifier le projet**
- `projet_id = contexte.projetId`

2) **Identifier l’animal**
- Si `animal_id` fourni: l’utiliser.
- Sinon si `animal_code` fourni:
  - Charger les animaux du projet via `GET /production/animaux?projet_id=...`
  - Trouver l’animal dont `code` correspond (insensible à la casse).
  - Si introuvable: demander clarification (ou proposer une liste si possible).

3) **Extraire et valider le poids**
- `poids_kg` requis, `> 0`.
- Supporter `45`, `45.5`, `45,5`.

4) **Date**
- Si absente: aujourd’hui au format `YYYY-MM-DD`.

5) **Appel API**

Payload attendu:
- `projet_id`
- `animal_id`
- `date` (YYYY-MM-DD)
- `poids_kg` (number)
- `commentaire` (optionnel)

6) **UI sync**
- Rafraîchir l’animal / liste des animaux si l’app affiche poids courant.
- Confirmer à l’utilisateur où voir la pesée.

---

## Exemples (few-shot)

### Exemple A — Pesée simple
Utilisateur: “P001 fait 45 kg”  
Action: `create_pesee`  
Valeurs:
- `animal_code = P001`
- `poids_kg = 45`
- `date = aujourd’hui`

### Exemple B — Pesée avec date
Utilisateur: “peser P002 52,5 kg le 25/12”  
Valeurs:
- `animal_code = P002`
- `poids_kg = 52.5`
- `date = 2025-12-25`


