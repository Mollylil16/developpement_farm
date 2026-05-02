# Procédure: `analyze_data` — Analyse globale de l’exploitation

**Catégorie:** `procedures`  
**Mots-clés:** analyze_data, procédure analyze_data, analyse, diagnostic, performance, situation élevage, recommandations, ui_target

---

**intent:** `analyze_data`  
**domain:** `info`  
**ui_target:** `Chat Kouakou (analyse)`  
**required_fields:** `projet_id (depuis contexte)`

---

## Procédure

1) Charger les données clés du projet (production, mortalité, finances, stocks) selon disponibilité.  
2) Identifier signaux: mortalité, stock bas, coûts élevés, GMQ/IC, etc.  
3) Retourner une analyse + recommandations actionnables.


