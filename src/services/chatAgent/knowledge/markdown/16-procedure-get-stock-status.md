# Procédure: `get_stock_status` — État des stocks d’alimentation

**Catégorie:** `procedures`  
**Mots-clés:** get_stock_status, procédure get_stock_status, stock, provende, aliment, nourriture, quantité restante, ui_target, nutrition

---

**intent:** `get_stock_status`  
**domain:** `nutrition`  
**ui_target:** `Menu Stocks / Aliments`  
**required_fields:** `projet_id (depuis contexte)`

---

## Procédure

1) `projet_id = contexte.projetId`  
2) Récupérer l’état des stocks via l’API backend (selon implémentation)  
3) Répondre avec quantités + alertes (si stock bas)

---

## Exemples

- “combien d’aliment il me reste ?” → `get_stock_status`
- “stock de provende” → `get_stock_status`


