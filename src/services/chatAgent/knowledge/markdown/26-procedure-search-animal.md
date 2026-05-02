# Procédure: `search_animal` — Rechercher un animal

**Catégorie:** `procedures`  
**Mots-clés:** search_animal, procédure search_animal, chercher animal, trouver porc, localiser, code animal, ui_target, production

---

**intent:** `search_animal`  
**domain:** `production`  
**ui_target:** `Menu Production > Animaux (recherche)`  
**required_fields:** `projet_id (depuis contexte), search`

---

## Procédure

1) Extraire `search` (code, nom, mot-clé).  
2) Rechercher dans les animaux du projet via l’API backend.  
3) Retourner le meilleur match (ou proposer une liste si plusieurs).


