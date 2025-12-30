# Procédure: `get_dettes_en_cours` — Dettes en cours

**Catégorie:** `procedures`  
**Mots-clés:** get_dettes_en_cours, procédure get_dettes_en_cours, dettes, dette, créances, en cours, ui_target, finance

---

**intent:** `get_dettes_en_cours`  
**domain:** `finance`  
**ui_target:** `Menu Finances > Dettes`  
**required_fields:** `projet_id (depuis contexte)`

---

## Procédure

1) `projet_id = contexte.projetId`  
2) Récupérer les dettes via l’API backend.  
3) Filtrer “en cours” (selon statut backend).  
4) Répondre: liste + total.


