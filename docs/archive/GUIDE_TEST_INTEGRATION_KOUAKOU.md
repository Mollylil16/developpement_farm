# 🧪 Guide de Test - Intégration Base de Connaissances avec Kouakou

**Date :** 27 décembre 2025  
**Objectif :** Vérifier que la base de connaissances est correctement intégrée avec Kouakou

---

## ✅ Prérequis

1. **Base de données PostgreSQL** configurée et accessible
2. **Table `knowledge_base`** créée (migration `051_create_knowledge_base_table.sql`)
3. **Fichiers Markdown** créés dans `src/services/chatAgent/knowledge/markdown/`
4. **Backend démarré** et accessible
5. **Frontend** (application React Native) prêt

---

## 📋 Étapes de Test

### Étape 1 : Importer la Base de Connaissances

#### 1.1 Vérifier les Fichiers Markdown

```bash
# Vérifier que tous les fichiers existent
ls src/services/chatAgent/knowledge/markdown/*.md
```

**Fichiers attendus :**
- `01-introduction-bonnes-pratiques.md`
- `02-nutrition-alimentation.md`
- `03-gestion-reproductivite.md`
- `04-croissance-engraissement.md`
- `05-hygiene-biosécurité.md`
- `06-sante-maladies.md`
- `07-identification-suivi.md`
- `08-gestion-economique.md`
- `09-astuces-conseils.md`
- `10-ressources-contacts.md`
- `README.md`

#### 1.2 Configurer les Variables d'Environnement

Vérifier que `.env` dans `backend/` contient :

```env
# Option 1: DATABASE_URL (recommandé)
DATABASE_URL=postgresql://user:password@host:port/database

# Option 2: Variables individuelles
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmtrack_db
DB_USER=farmtrack_user
DB_PASSWORD=postgres
DB_SSL=false
```

#### 1.3 Exécuter le Script d'Importation

```bash
cd backend
npm run import:knowledge-base
```

**Résultat attendu :**
```
🚀 Démarrage de l'importation de la base de connaissances...
📁 10 fichier(s) Markdown trouvé(s)
✅ Parsé: 1. Introduction et Bonnes Pratiques Générales (general)
...
✅ Connexion à la base de données établie
✅ Créé: 1. Introduction et Bonnes Pratiques Générales
...
📈 Résumé de l'importation:
   ✅ Créés: 10
   🔄 Mis à jour: 0
   ❌ Erreurs: 0
   📊 Total: 10
🎉 Importation terminée avec succès !
```

#### 1.4 Vérifier dans la Base de Données

```sql
-- Vérifier le nombre de contenus importés
SELECT COUNT(*) FROM knowledge_base WHERE is_active = true;

-- Vérifier les catégories
SELECT category, COUNT(*) FROM knowledge_base GROUP BY category;

-- Vérifier un contenu spécifique
SELECT title, category, keywords FROM knowledge_base LIMIT 5;
```

---

### Étape 2 : Tester l'API Backend

#### 2.1 Test de Recherche

```bash
# Recherche simple
curl -X GET "http://localhost:3000/knowledge-base/search?query=nutrition" \
  -H "Content-Type: application/json"

# Recherche par catégorie
curl -X GET "http://localhost:3000/knowledge-base/search?query=alimentation&category=alimentation" \
  -H "Content-Type: application/json"

# Lister les catégories
curl -X GET "http://localhost:3000/knowledge-base/categories" \
  -H "Content-Type: application/json"
```

**Résultats attendus :**
- Retourne des résultats pertinents
- Score de pertinence calculé
- Catégories listées correctement

#### 2.2 Test de Récupération par ID

```bash
# Récupérer un contenu par ID
curl -X GET "http://localhost:3000/knowledge-base/{id}" \
  -H "Content-Type: application/json"
```

---

### Étape 3 : Tester avec Kouakou (Frontend)

#### 3.1 Questions de Base

Tester ces questions dans l'interface de chat avec Kouakou :

1. **"Qu'est-ce qu'un naisseur ?"**
   - **Attendu :** Réponse sur les types d'élevage
   - **Source :** `01-introduction-bonnes-pratiques.md`

2. **"Comment formuler une ration pour porcelets ?"**
   - **Attendu :** Réponse sur la nutrition et formulation
   - **Source :** `02-nutrition-alimentation.md`

3. **"Quand faire le sevrage des porcelets ?"**
   - **Attendu :** Réponse sur la gestion de la reproductivité
   - **Source :** `03-gestion-reproductivite.md`

4. **"Quel est le GMQ idéal pour les porcs en finition ?"**
   - **Attendu :** Réponse sur la croissance et engraissement
   - **Source :** `04-croissance-engraissement.md`

5. **"Comment désinfecter la porcherie ?"**
   - **Attendu :** Réponse sur l'hygiène et biosécurité
   - **Source :** `05-hygiene-biosécurité.md`

6. **"Quel est le programme vaccinal pour les truies ?"**
   - **Attendu :** Réponse sur la santé et vaccinations
   - **Source :** `06-sante-maladies.md`

7. **"Comment identifier mes porcs ?"**
   - **Attendu :** Réponse sur l'identification et suivi
   - **Source :** `07-identification-suivi.md`

8. **"Comment calculer ma marge brute ?"**
   - **Attendu :** Réponse sur la gestion économique
   - **Source :** `08-gestion-economique.md`

9. **"Comment réduire la mortalité des porcelets ?"**
   - **Attendu :** Réponse avec astuces pratiques
   - **Source :** `09-astuces-conseils.md`

10. **"Où trouver un vétérinaire ?"**
    - **Attendu :** Réponse sur les ressources et contacts
    - **Source :** `10-ressources-contacts.md`

#### 3.2 Vérifier les Réponses

Pour chaque question, vérifier :
- ✅ Kouakou répond correctement
- ✅ La réponse est pertinente et complète
- ✅ Le contenu provient de la base de connaissances
- ✅ Le format est lisible (Markdown rendu correctement)
- ✅ Les liens vers l'application fonctionnent (si présents)

#### 3.3 Tester le Fallback

**Scénario :** Désactiver temporairement l'API backend

**Test :**
1. Arrêter le backend
2. Poser une question à Kouakou
3. Vérifier que le fallback sur `TrainingKnowledgeBase.ts` fonctionne

**Attendu :** Kouakou répond quand même (base statique)

---

### Étape 4 : Tests de Performance

#### 4.1 Temps de Réponse

Mesurer le temps de réponse pour :
- Recherche simple : < 500ms
- Recherche complexe : < 1s
- Récupération par ID : < 200ms

#### 4.2 Pertinence des Résultats

Vérifier que :
- Les résultats les plus pertinents apparaissent en premier
- Le score de pertinence est cohérent
- Les mots-clés sont bien pris en compte

---

## 🐛 Dépannage

### Problème : Aucun résultat de recherche

**Solutions :**
1. Vérifier que les contenus sont bien importés dans la DB
2. Vérifier que `is_active = true`
3. Vérifier les mots-clés dans la recherche
4. Vérifier la fonction `search_knowledge` dans PostgreSQL

### Problème : Kouakou ne trouve pas les réponses

**Solutions :**
1. Vérifier que l'API backend est accessible
2. Vérifier les logs du backend pour erreurs
3. Vérifier que `KnowledgeBaseAPI.search()` fonctionne
4. Tester le fallback sur la base statique

### Problème : Erreurs de parsing Markdown

**Solutions :**
1. Vérifier le format des fichiers Markdown
2. Vérifier que les métadonnées sont présentes (catégorie, mots-clés)
3. Vérifier les logs du script d'importation

### Problème : Doublons dans la base

**Solutions :**
1. Le script gère automatiquement les doublons (mise à jour)
2. Vérifier que les titres sont uniques
3. Nettoyer manuellement si nécessaire :

```sql
-- Voir les doublons
SELECT title, COUNT(*) 
FROM knowledge_base 
GROUP BY title 
HAVING COUNT(*) > 1;

-- Supprimer les doublons (garder le plus récent)
DELETE FROM knowledge_base 
WHERE id NOT IN (
  SELECT DISTINCT ON (title) id 
  FROM knowledge_base 
  ORDER BY title, created_at DESC
);
```

---

## ✅ Checklist de Validation

- [ ] Tous les fichiers Markdown sont présents (10 fichiers)
- [ ] Le script d'importation s'exécute sans erreur
- [ ] Les contenus sont importés dans la base de données
- [ ] L'API backend retourne des résultats de recherche
- [ ] Kouakou répond correctement aux questions de base
- [ ] Le fallback sur la base statique fonctionne
- [ ] Les performances sont acceptables (< 1s)
- [ ] Les résultats sont pertinents

---

## 📊 Métriques de Succès

### Critères de Réussite

1. **Taux de réussite des recherches** : > 90%
2. **Temps de réponse moyen** : < 500ms
3. **Pertinence des résultats** : Score > 5/10
4. **Couverture des sujets** : 100% des 10 sections accessibles

### Tests Automatisés (Optionnel)

Créer des tests unitaires pour :
- Parsing des fichiers Markdown
- Importation dans la base de données
- Recherche par mots-clés
- Recherche par catégorie
- Fallback sur base statique

---

## 🎯 Prochaines Étapes

Après validation :

1. **Documenter** les résultats des tests
2. **Optimiser** si nécessaire (index, cache)
3. **Enrichir** la base de connaissances avec de nouveaux contenus
4. **Former** les utilisateurs sur l'utilisation de Kouakou

---

**💡 Astuce :** Utilise les logs du backend et du frontend pour diagnostiquer les problèmes. Les erreurs sont généralement liées à la configuration de la base de données ou au format des fichiers Markdown.

