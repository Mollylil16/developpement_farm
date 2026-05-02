# Procédure: `create_ingredient` — Créer un ingrédient (alimentation)

**Catégorie:** `procedures`  
**Mots-clés:** create_ingredient, procédure create_ingredient, ingrédient, aliment, prix_unitaire, unite, kg, sac, tonne, champ obligatoire, required_fields, ui_target, nutrition

---

**intent:** `create_ingredient`  
**domain:** `nutrition`  
**ui_target:** `Menu Alimentation > Ingrédients/Stocks`  
**required_fields:** `nom, prix_unitaire`  
**optional_fields:** `unite (kg|g|sac|tonne)`

---

## Procédure

1) Extraire `nom` (obligatoire).  
2) Extraire `prix_unitaire` (obligatoire, >0).  
3) `unite` (défaut `kg`).  
4) Appeler l’API backend correspondante.  
5) UI sync: rafraîchir la liste des ingrédients.


