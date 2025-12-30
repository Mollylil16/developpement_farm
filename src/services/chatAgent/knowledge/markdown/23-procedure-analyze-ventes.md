# Procédure: `analyze_ventes` — Analyse des ventes

**Catégorie:** `procedures`  
**Mots-clés:** analyze_ventes, procédure analyze_ventes, analyse ventes, revenus, tendance ventes, moyenne, meilleur mois, ui_target, finance

---

**intent:** `analyze_ventes`  
**domain:** `finance`  
**ui_target:** `Menu Revenus / Ventes (analyse)`  
**required_fields:** `projet_id (depuis contexte)`  
**optional_fields:** `période (si supportée)`

---

## Procédure

1) Charger les ventes (revenus catégorie vente).  
2) Calculer: total, moyenne, évolution, pics.  
3) Retourner une analyse claire + recommandations (prix, période, poids, etc.).


