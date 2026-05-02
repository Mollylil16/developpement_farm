# Procédure: `answer_knowledge_question` — Répondre via la base de connaissances

**Catégorie:** `procedures`  
**Mots-clés:** answer_knowledge_question, procédure answer_knowledge_question, base, connaissances, base de connaissances, knowledge base, formation, comment, pourquoi, explication, RAG, ui_target, knowledge

---

**intent:** `answer_knowledge_question`  
**domain:** `knowledge`  
**ui_target:** `Chat Kouakou (réponse informative)`  
**required_fields:** `question (ou userMessage)`  
**optional_fields:** `topic (catégorie knowledge)`

---

## Procédure

1) Reformuler la question.  
2) Rechercher dans la Knowledge Base (`/knowledge-base/search`) avec `query=question`.  
3) Si résultats: répondre en citant le meilleur contenu + proposer sujets connexes.  
4) Sinon: fallback base statique locale (TrainingKnowledgeBase).


