# Procédure: Gestion des loges (mode bande) — `creer_loge`, `deplacer_animaux`, `get_animaux_par_loge`

**Catégorie:** `procedures`  
**Mots-clés:** bande, loge, creer_loge, deplacer_animaux, get_animaux_par_loge, procédure, batch, déplacement, transfert, ui_target, champ obligatoire, POST /batch-pigs/create-batch, POST /batch-pigs/transfer

---

## Chunk 1 — `creer_loge`

**intent:** `creer_loge`  
**domain:** `batch`  
**ui_target:** `Mode Bande > Loges`  
**required_fields:** `projet_id (depuis contexte), pen_name, category, total_count`  
**endpoint (backend):** `POST /batch-pigs/create-batch`

Procédure:
1) Valider le projet actif.
2) Extraire: nom loge (`pen_name`), catégorie (truie_reproductrice/verrat_reproducteur/porcelets/porcs_croissance/porcs_engraissement), effectif.
3) Créer la loge (batch) via l’API.
4) UI sync: rafraîchir la liste des loges.

---

## Chunk 2 — `deplacer_animaux`

**intent:** `deplacer_animaux`  
**domain:** `batch`  
**ui_target:** `Mode Bande > Déplacements`  
**required_fields:** `projet_id (depuis contexte), from_batch_id, to_batch_id, pig_ids (ou count), date`  
**endpoint (backend):** `POST /batch-pigs/transfer`

Procédure:
1) Identifier loge source + loge destination.
2) Identifier animaux à déplacer (liste ou nombre).
3) Exécuter le transfert.
4) UI sync: rafraîchir les 2 loges.

---

## Chunk 3 — `get_animaux_par_loge`

**intent:** `get_animaux_par_loge`  
**domain:** `batch`  
**ui_target:** `Mode Bande > Détail loge`  
**required_fields:** `batch_id`
**endpoint (backend):** `GET /batch-pigs/batch/:batchId`

Procédure:
1) Identifier `batch_id`.
2) Charger la liste des animaux de la loge.
3) Répondre avec effectif + éléments clés.


