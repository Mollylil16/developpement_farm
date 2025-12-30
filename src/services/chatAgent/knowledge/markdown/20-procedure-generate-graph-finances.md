# Procédure: `generate_graph_finances` — Générer un graphique finances

**Catégorie:** `procedures`  
**Mots-clés:** generate_graph_finances, procédure generate_graph_finances, graphique finances, évolution dépenses, évolution revenus, courbe, mois, ui_target, finance

---

**intent:** `generate_graph_finances`  
**domain:** `finance`  
**ui_target:** `Menu Finances > Graphiques`  
**required_fields:** `projet_id (depuis contexte)`  
**optional_fields:** `mois (défaut: 6)`

---

## Procédure

1) Déterminer le nombre de mois à afficher (défaut 6).  
2) Récupérer les séries revenus/dépenses.  
3) Retourner un dataset exploitable par l’UI (labels, valeurs).


