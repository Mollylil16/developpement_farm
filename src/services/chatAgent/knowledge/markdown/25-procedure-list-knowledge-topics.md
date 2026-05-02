# Procédure: `list_knowledge_topics` — Lister les thèmes de formation

**Catégorie:** `procedures`  
**Mots-clés:** list_knowledge_topics, procédure list_knowledge_topics, thèmes, formation, catégories, knowledge base, ui_target

---

**intent:** `list_knowledge_topics`  
**domain:** `knowledge`  
**ui_target:** `Chat Kouakou (liste de thèmes)`  
**required_fields:** `projet_id (depuis contexte)`

---

## Procédure

1) Charger les catégories disponibles via `/knowledge-base/categories` (si disponible).  
2) Sinon fallback sur la liste statique locale.  
3) Afficher thèmes + exemples de questions.


