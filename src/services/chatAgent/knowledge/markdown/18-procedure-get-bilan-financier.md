# Procédure: `get_bilan_financier` — Bilan financier

**Catégorie:** `procedures`  
**Mots-clés:** get_bilan_financier, procédure get_bilan_financier, bilan, finances, résumé, revenus, dépenses, marge, ui_target, finance

---

**intent:** `get_bilan_financier`  
**domain:** `finance`  
**ui_target:** `Menu Finances > Bilan`  
**required_fields:** `projet_id (depuis contexte)`  
**optional_fields:** `période (si supportée)`

---

## Procédure

1) `projet_id = contexte.projetId`  
2) Charger revenus + dépenses sur la période par défaut (ou période demandée).  
3) Calculer / afficher: total revenus, total dépenses, solde, tendances si disponible.  
4) Répondre avec un résumé exploitable.


