# Procédure: `propose_composition_alimentaire` — Proposer une composition alimentaire

**Catégorie:** `procedures`  
**Mots-clés:** propose_composition_alimentaire, procédure propose_composition_alimentaire, formulation, ration, composition, aliment, nutrition, ui_target

---

**intent:** `propose_composition_alimentaire`  
**domain:** `nutrition`  
**ui_target:** `Menu Alimentation > Formulation`  
**required_fields:** `projet_id (depuis contexte)`  
**optional_fields:** `objectif (GMQ/IC), catégorie d’animaux, ingrédients disponibles`

---

## Procédure

1) Comprendre la cible (porcelets, croissance, finition, truies).  
2) Utiliser les stocks/ingrédients disponibles si l’app le permet.  
3) Retourner une proposition (pourcentages + coût estimé).


