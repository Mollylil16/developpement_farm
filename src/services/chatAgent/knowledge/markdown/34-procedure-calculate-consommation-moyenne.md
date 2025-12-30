# Procédure: `calculate_consommation_moyenne` — Consommation moyenne d’aliment

**Catégorie:** `procedures`  
**Mots-clés:** calculate_consommation_moyenne, procédure calculate_consommation_moyenne, consommation, aliment, provende, moyenne, stock, nutrition, ui_target

---

**intent:** `calculate_consommation_moyenne`  
**domain:** `nutrition`  
**ui_target:** `Menu Alimentation > Consommation`  
**required_fields:** `projet_id (depuis contexte)`  
**optional_fields:** `période, type d’animaux`

---

## Procédure

1) Déterminer la période (par défaut semaine/mois selon app).  
2) Agréger sorties/consommations d’aliment.  
3) Retourner moyenne par jour et estimation autonomie stock.


