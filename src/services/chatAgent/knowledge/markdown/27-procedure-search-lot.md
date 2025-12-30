# Procédure: `search_lot` — Rechercher un lot

**Catégorie:** `procedures`  
**Mots-clés:** search_lot, procédure search_lot, lot, bande, trouver lot, localiser lot, ui_target, production

---

**intent:** `search_lot`  
**domain:** `production`  
**ui_target:** `Menu Production > Lots/Bandes (recherche)`  
**required_fields:** `projet_id (depuis contexte), search`

---

## Procédure

1) Extraire `search` (lot_id, libellé, terme).  
2) Rechercher parmi les lots/bandes du projet (API backend).  
3) Retourner le meilleur match (ou proposer une liste).


