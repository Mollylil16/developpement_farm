# Procédure: `get_statistics` — Statistiques du cheptel

**Catégorie:** `procedures`  
**Mots-clés:** get_statistics, procédure get_statistics, statistiques, bilan, combien de porcs, cheptel, effectif, ui_target, info

---

**intent:** `get_statistics`  
**domain:** `info`  
**ui_target:** `Écran Statistiques / Cheptel`  
**required_fields:** `projet_id (depuis contexte)`

---

## Procédure

1) Vérifier le projet actif (`projet_id` depuis contexte).  
2) Appeler l’action d’agrégation des statistiques (API backend selon implémentation).  
3) Répondre avec un résumé clair (effectif total, répartition, etc.).

---

## Exemples

- “combien de porcs j’ai ?” → `get_statistics`
- “bilan du cheptel” → `get_statistics`


