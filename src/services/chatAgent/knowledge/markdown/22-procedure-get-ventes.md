# Procédure: `get_ventes` — Consulter les ventes

**Catégorie:** `procedures`  
**Mots-clés:** get_ventes, procédure get_ventes, ventes, revenus, vente_porc, derniers jours, ui_target, finance

---

**intent:** `get_ventes`  
**domain:** `finance`  
**ui_target:** `Menu Revenus / Ventes`  
**required_fields:** `projet_id (depuis contexte)`  
**optional_fields:** `jours (défaut: 90)`

---

## Procédure

1) Charger les revenus du projet.  
2) Filtrer la catégorie `vente_porc` (ou `vente` si existant).  
3) Option: limiter aux N derniers jours.  
4) Répondre avec la liste + total.


