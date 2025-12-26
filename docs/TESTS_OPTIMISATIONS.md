# Guide de Test des Optimisations de Performance

**Date:** 2025-01-XX  
**Version:** Post-optimisations Phases 1-4

---

## 🎯 Objectif

Ce guide fournit une checklist complète pour tester toutes les optimisations de performance implémentées.

---

## ✅ Prérequis

1. ✅ Migration 046 appliquée en base de données
2. ✅ Code déployé (backend + frontend)
3. ✅ Base de données avec des données de test (recommandé: 100+ animaux, 500+ pesées)

---

## 📋 Checklist de Tests

### Phase 1 - Quick Wins

#### 1.1 Délais artificiels supprimés
- [ ] **Test:** Charger le dashboard
- [ ] **Vérifier:** Le dashboard se charge sans délai artificiel visible
- [ ] **Mesure:** Temps de chargement < 500ms (devrait être ~400ms)
- [ ] **Outils:** Chrome DevTools → Network tab, React Native Debugger

#### 1.2 Réduction du chargement des pesées
- [ ] **Test:** Ouvrir le dashboard avec un projet actif
- [ ] **Vérifier:** Seulement 20 pesées récentes sont chargées (au lieu de 100)
- [ ] **Vérifier:** Les statistiques s'affichent correctement malgré la réduction
- [ ] **Outils:** React Native Debugger → Redux DevTools → Vérifier `peseesRecents.length === 20`

#### 1.3 API BatchCheptelView
- [ ] **Test:** Créer/modifier un projet avec `management_method = 'batch'`
- [ ] **Vérifier:** Les bandes s'affichent correctement (pas de données de démonstration)
- [ ] **Vérifier:** L'endpoint `GET /batch-pigs/projet/:projetId` est appelé
- [ ] **Outils:** Network tab pour vérifier les appels API

---

### Phase 2 - Optimisations Frontend

#### 2.1 Optimisation des calculs OverviewWidget
- [ ] **Test:** Ouvrir le dashboard avec un projet contenant 100+ animaux
- [ ] **Vérifier:** Les statistiques se calculent rapidement (< 50ms)
- [ ] **Vérifier:** Pas de lag perceptible lors du scroll
- [ ] **Outils:** React DevTools Profiler → Enregistrer un rendu → Vérifier le temps

#### 2.2 React.memo sur composants enfants
- [ ] **Test:** Ouvrir le dashboard et naviguer entre les onglets
- [ ] **Vérifier:** Les widgets ne se re-rendent pas inutilement
- [ ] **Test:** Modifier une donnée non liée (ex: profil utilisateur)
- [ ] **Vérifier:** Les widgets ne se re-rendent pas
- [ ] **Outils:** React DevTools → Highlight updates → Vérifier les re-renders

#### 2.3 Debouncing des recherches
- [ ] **Test:** Ouvrir la liste du cheptel
- [ ] **Test:** Taper rapidement dans le champ de recherche
- [ ] **Vérifier:** Le filtrage ne se déclenche qu'après 300ms d'inactivité
- [ ] **Vérifier:** Pas de lag pendant la saisie
- [ ] **Outils:** Console logs (si activés) pour voir les appels

---

### Phase 3 - Optimisations Backend

#### 3.1 Indexes de base de données
- [ ] **Test:** Exécuter des requêtes fréquentes
- [ ] **Vérifier:** Les temps d'exécution sont réduits
- [ ] **Test SQL:**
  ```sql
  EXPLAIN ANALYZE 
  SELECT * FROM production_animaux 
  WHERE projet_id = 'xxx' AND statut = 'actif' 
  ORDER BY date_creation DESC;
  ```
- [ ] **Vérifier:** L'index `idx_production_animaux_projet_statut` est utilisé
- [ ] **Vérifier:** Temps d'exécution < 50ms (devrait être beaucoup moins)

#### 3.2 Pagination sur endpoints
- [ ] **Test:** Appeler `GET /production/animaux?projet_id=xxx&limit=10`
- [ ] **Vérifier:** Seulement 10 animaux sont retournés
- [ ] **Test:** Appeler `GET /production/animaux?projet_id=xxx&limit=10&offset=10`
- [ ] **Vérifier:** Les 10 animaux suivants sont retournés
- [ ] **Test:** Appeler sans paramètres de pagination
- [ ] **Vérifier:** Limite par défaut de 500 est appliquée
- [ ] **Outils:** Postman, curl, ou Network tab

#### 3.3 Cache en mémoire
- [ ] **Test:** Appeler `GET /production/stats/:projet_id` deux fois rapidement
- [ ] **Vérifier:** La deuxième requête est plus rapide (vient du cache)
- [ ] **Test:** Modifier un animal (create/update/delete)
- [ ] **Vérifier:** Le cache est invalidé (la prochaine requête recalcule)
- [ ] **Test:** Attendre 2+ minutes après une requête
- [ ] **Vérifier:** Le cache expire (TTL de 2 minutes)
- [ ] **Outils:** Network tab pour comparer les temps, logs backend

#### 3.4 Cache des statistiques de mortalité
- [ ] **Test:** Appeler `GET /mortalites/statistiques?projet_id=xxx` deux fois
- [ ] **Vérifier:** Cache fonctionne comme pour les stats de projet
- [ ] **Test:** Créer/modifier/supprimer une mortalité
- [ ] **Vérifier:** Cache invalidé correctement

---

### Phase 4 - Optimisations Avancées

#### 4.1 Lazy loading des images
- [ ] **Test:** Ouvrir la liste du cheptel avec 50+ animaux ayant des photos
- [ ] **Vérifier:** Les images se chargent progressivement (lazy loading)
- [ ] **Vérifier:** Un placeholder s'affiche pendant le chargement
- [ ] **Test:** Scroller rapidement dans la liste
- [ ] **Vérifier:** Seules les images visibles sont chargées
- [ ] **Vérifier:** Les images hors écran ne sont pas chargées immédiatement
- [ ] **Outils:** Network tab → Filtrer par "Image" → Vérifier le timing

#### 4.2 Monitoring de performance
- [ ] **Test:** Activer le mode développement
- [ ] **Vérifier:** Les logs de performance apparaissent dans la console
- [ ] **Test:** Utiliser `performanceMonitor.measure()` dans une fonction
- [ ] **Vérifier:** Les métriques sont enregistrées
- [ ] **Test:** Appeler `performanceMonitor.printReport()`
- [ ] **Vérifier:** Un rapport s'affiche dans la console
- [ ] **Outils:** Console logs, React Native Debugger

---

## 📊 Métriques à Mesurer

### Avant/Après les Optimisations

| Métrique | Avant | Après (cible) | Comment mesurer |
|----------|-------|---------------|-----------------|
| Temps chargement dashboard | ~800ms | ~400ms | Network tab, timestamps |
| Données transférées (dashboard) | ~500KB | ~150KB | Network tab → Size |
| Re-renders (liste 100 items) | ~200 | ~80 | React DevTools Profiler |
| Temps calcul stats | ~50ms | ~20ms | PerformanceMonitor |
| Temps requête SQL (avec index) | Variable | -50-90% | EXPLAIN ANALYZE |
| Temps chargement images | ~500ms | ~200ms | Network tab → Image timing |
| Consommation mémoire | 100% | 70% | React Native Debugger → Memory |

---

## 🔧 Outils de Test

### Frontend
- **React Native Debugger**: Profiler, Redux DevTools
- **Chrome DevTools**: Network tab, Performance tab
- **React DevTools**: Component tree, Profiler
- **PerformanceMonitor**: Utilitaire intégré (`src/utils/performanceMonitor.ts`)

### Backend
- **Postman/Insomnia**: Tests d'endpoints
- **psql**: Tests SQL directs
- **EXPLAIN ANALYZE**: Analyse des requêtes SQL
- **Logs backend**: Vérification du cache, pagination

### Base de données
- **pgAdmin / DBeaver**: Interface graphique
- **psql**: Ligne de commande
- **Vérification indexes**: 
  ```sql
  SELECT * FROM pg_indexes WHERE tablename = 'production_animaux';
  ```

---

## 🐛 Problèmes Potentiels et Solutions

### Problème: Les indexes ne sont pas créés
**Solution:** Vérifier que la migration 046 a été exécutée correctement
```sql
SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_%projet%';
```

### Problème: Le cache ne fonctionne pas
**Solution:** Vérifier que `CacheService` est bien injecté dans les services
- Vérifier `backend/src/common/common.module.ts`
- Vérifier que `CommonModule` est importé dans `AppModule`

### Problème: Les images ne se chargent pas en lazy
**Solution:** Vérifier que `OptimizedImage` est utilisé au lieu de `Image`
- Vérifier les imports dans `AnimalCard.tsx`
- Vérifier que `expo-image` est installé

### Problème: La pagination ne fonctionne pas
**Solution:** Vérifier les paramètres de requête
- Utiliser `limit` et `offset` comme query parameters
- Vérifier que les valeurs sont des nombres valides

---

## ✅ Critères de Succès

L'optimisation est considérée comme réussie si:

1. ✅ Le temps de chargement du dashboard est réduit d'au moins 40%
2. ✅ Les requêtes SQL utilisent les nouveaux indexes (vérifié via EXPLAIN)
3. ✅ Le cache réduit le temps de réponse des stats d'au moins 50%
4. ✅ Les images se chargent progressivement (lazy loading visible)
5. ✅ Pas de régression fonctionnelle (toutes les fonctionnalités marchent)
6. ✅ Pas d'erreurs dans les logs

---

## 📝 Rapport de Test

Après les tests, remplir ce rapport:

```
Date: __________
Testeur: __________

✅ Tests réussis: ___/___
❌ Tests échoués: ___/___

Métriques mesurées:
- Temps chargement dashboard: _____ms (cible: <400ms)
- Temps requête SQL: _____ms (avant: _____ms)
- Cache hit rate: _____% (cible: >50%)

Problèmes identifiés:
1. 
2. 

Commentaires:
_________________________________________________________________
_________________________________________________________________
```

---

**Note:** Effectuer ces tests dans un environnement de développement/staging avant de déployer en production.

