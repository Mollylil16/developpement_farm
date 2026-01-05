# PHASE 1 : ANALYSE COMPARATIVE DES MENUS DE SUIVI DES PESÉES

**Date** : 2025-01-10  
**Objectif** : Documenter l'état actuel des deux modes (individuel et bande) pour créer une parité complète

---

## 1.1 - MODE ÉLEVAGE EN BANDE (Référence - État actuel)

### Fichiers clés identifiés

- **Écran principal** : `src/screens/WeighingScreen.tsx` (lignes 1-1208)
- **Modal détails** : `src/components/batch/BatchWeighingDetailsModal.tsx`
- **Graphique évolution** : `src/components/batch/BatchWeightEvolutionChart.tsx`
- **Services** : API `/batch-weighings/`

---

### A) VUE D'ENSEMBLE / DASHBOARD

#### ✅ Fonctionnalités présentes

1. **Statistiques globales de la ferme** (`GlobalFarmStats` - lignes 123-357)
   - 📊 **Composant** : `GlobalFarmStats` intégré dans `WeighingScreen`
   - **Métriques affichées** :
     - Nombre total de loges
     - Nombre total d'animaux
     - Nombre total de pesées
     - Poids moyen de tous les animaux
   - **Graphe d'évolution globale** :
     - ✅ Présent : `BatchWeightEvolutionChart` pour toutes les loges
     - Affiche le poids total de la ferme par date
     - Calcule le GMQ global comme moyenne des GMQ de chaque loge
   - **Position** : Affiché en haut de l'écran (ligne 702-708)

2. **Statistiques par loge** (lignes 821-840)
   - Total pesées par loge
   - Poids moyen par loge
   - Affiché quand une loge est sélectionnée

#### ❌ Fonctionnalités manquantes

- ❌ Période personnalisée pour le dashboard (fixe, pas de sélection 7j/30j/90j)
- ❌ Indicateur "animaux en retard de pesée" au niveau global
- ❌ Taux d'objectifs atteints
- ❌ Dernière pesée globale (date la plus récente parmi toutes les loges)

---

### B) LISTE DES SUJETS / LOGES

#### ✅ Fonctionnalités présentes

1. **Sélecteur de loges** (lignes 711-887)
   - 📋 Affichage en grille de toutes les loges disponibles
   - **Informations par carte loge** :
     - Nom de la loge (`pen_name`)
     - Catégorie (type de logement)
     - Nombre de sujets (`total_count`)
     - Poids moyen actuel (`average_weight_kg`)
   - **Interactions** :
     - ✅ Clic pour sélectionner/désélectionner une loge
     - ✅ Bouton "Peser cette loge" sur chaque carte
     - ✅ Expansion des détails quand une loge est sélectionnée

2. **Affichage des pesées** (lignes 858-877)
   - Liste des pesées pour la loge sélectionnée
   - **Composant** : `WeighingCard` (lignes 63-121)
   - **Informations affichées** :
     - Date de pesée
     - Poids moyen (ou min-max si disponible)
     - Nombre de porcs pesés
     - Notes/commentaires
   - **Action** : Bouton "Voir les détails" pour modal détaillée

#### ❌ Fonctionnalités manquantes

- ❌ Tri/filtrage des loges (par nom, nombre d'animaux, poids moyen)
- ❌ Recherche de loge par nom
- ❌ Badge "En retard" si aucune pesée récente
- ❌ Affichage du GMQ par loge dans la liste

---

### C) DÉTAILS D'UNE PESÉE (Modal)

#### ✅ Fonctionnalités présentes

1. **Modal de détails** : `BatchWeighingDetailsModal.tsx`
   - **Contenu** :
     - 📋 Informations de la pesée (date, nombre de porcs)
     - ⚖️ Poids moyen
     - 📊 Fourchette min-max
     - 📝 Notes
     - 📋 **Répartition par sujet** :
       - Nom/code de chaque sujet
       - Sexe
       - Poids individuel
       - Date d'entrée dans la loge

2. **Graphique d'évolution** : `BatchWeightEvolutionChart.tsx`
   - ✅ **Présent** : Affiché dans les détails de la loge sélectionnée (ligne 843-855)
   - **Fonctionnalités** :
     - Courbe d'évolution du poids moyen
     - Affichage du GMQ calculé
     - Statistiques : poids initial, actuel, gain total
     - Graphique horizontal scrollable
     - Format : Courbe avec points cliquables

#### ❌ Fonctionnalités manquantes

- ❌ Historique complet des pesées en tableau (seulement graphique)
- ❌ Comparaison avec objectif de poids
- ❌ Période ajustable (7j, 30j, 90j, tout)
- ❌ Export des données (PNG, PDF)
- ❌ Filtrage des sujets dans la répartition

---

### D) GRAPHE D'ÉVOLUTION

#### ✅ Fonctionnalités présentes

1. **Graphe par loge** : `BatchWeightEvolutionChart` (lignes 843-855)
   - Courbe d'évolution du poids moyen de la loge
   - Calcul automatique du GMQ
   - Statistiques intégrées (poids initial, actuel, gain)

2. **Graphe global de la ferme** : `GlobalFarmStats` (lignes 339-354)
   - Poids total de la ferme par date
   - GMQ moyen global
   - Toutes les loges agrégées

#### ❌ Fonctionnalités manquantes

- ❌ Graphe avec courbes superposées de plusieurs loges (comparaison)
- ❌ Légende interactive (afficher/masquer loges)
- ❌ Export PNG/PDF du graphique
- ❌ Zoom/pan si beaucoup de données
- ❌ Tooltip au survol des points

---

### E) CALCUL DU GMQ

#### ✅ Fonctionnalités présentes

1. **Calcul dans `BatchWeightEvolutionChart`** (lignes 134-164)
   - **Formule** : `(gain_total_kg / nombre_jours) * 1000` → g/jour
   - **Période** : Entre première et dernière pesée de la loge
   - **Affichage** : En g/jour (formaté avec `.toFixed(0)`)
   - **Gestion cas limites** :
     - Si pesées le même jour : utilise minimum 0.1 jour
     - Si gain négatif : retourne 0

2. **Calcul GMQ global** : `WeighingScreen` (lignes 235-292)
   - Calcule le GMQ pour chaque loge
   - Fait la moyenne de tous les GMQ
   - Utilisé pour le graphique global

#### ❌ Fonctionnalités manquantes

- ❌ GMQ calculé sur période spécifique (ex: 7 derniers jours)
- ❌ GMQ par intervalle entre pesées consécutives
- ❌ Alerte si GMQ en baisse

---

### F) FONCTIONNALITÉS SUPPLÉMENTAIRES

#### ✅ Fonctionnalités présentes

- ✅ Modal de paramètres GMQ (`BatchSettingsModal`) - ligne 679
- ✅ Rafraîchissement pull-to-refresh (ligne 692-698)
- ✅ Bouton "Nouvelle pesée" avec sélection de loge (ligne 951-968)

#### ❌ Fonctionnalités manquantes

- ❌ Alerte si pesée en retard (basée sur fréquence attendue)
- ❌ Notification si perte de poids détectée
- ❌ Comparaison avec standards de la race
- ❌ Export des données (CSV, Excel)
- ❌ Impression de rapports
- ❌ Historique des pesées en tableau (actuellement seulement graphique)

---

## 1.2 - MODE SUIVI INDIVIDUEL (État actuel)

### Fichiers clés identifiés

- **Écran principal** : `src/screens/WeighingScreen.tsx` (même fichier, mode conditionnel)
- **Graphique évolution** : `src/components/WeightEvolutionChart.tsx`
- **Composant carte animal** : `src/components/production/AnimalCard.tsx`
- **Services** : API `/production/pesees/`

---

### A) VUE D'ENSEMBLE / DASHBOARD

#### ✅ Fonctionnalités présentes

1. **Statistiques simples** (lignes 918-936)
   - 📊 **Composant** : Card avec statistiques (lignes 919-936)
   - **Métriques affichées** :
     - Total pesées
     - Poids moyen
   - **Position** : En haut de l'écran (ligne 918)

#### ❌ Fonctionnalités manquantes

- ❌ **Dashboard complet** : Pas de vue d'ensemble avec toutes les métriques
- ❌ Graphe d'évolution du poids moyen du cheptel
- ❌ GMQ moyen du cheptel
- ❌ Nombre d'animaux en retard de pesée
- ❌ Date de dernière pesée (la plus récente)
- ❌ Taux d'objectifs atteints
- ❌ Période personnalisée (7j, 30j, 90j)

---

### B) LISTE DES SUJETS

#### ⚠️ Fonctionnalités partielles

1. **Affichage des pesées** (lignes 899-948)
   - Liste des pesées récentes (pas par animal)
   - **Composant** : `WeighingCard` réutilisé (ligne 940-944)
   - **Informations affichées** :
     - Code/ID de l'animal
     - Date de pesée
     - Poids
     - Notes
   - **Source des données** : Redux `selectPeseesRecents` (ligne 428)

#### ❌ Fonctionnalités manquantes

- ❌ **Liste des animaux avec cartes** : Pas de vue par animal avec toutes ses pesées
- ❌ Carte par animal avec :
  - Photo/icône
  - Poids actuel
  - GMQ calculé
  - Date dernière pesée
  - Badge "En retard" si applicable
- ❌ Tri/filtrage (par poids, GMQ, date dernière pesée)
- ❌ Recherche par code/ID
- ❌ Voir détails d'un animal (écran dédié)

---

### C) DÉTAILS D'UN SUJET INDIVIDUEL

#### ✅ Fonctionnalités présentes

1. **Graphique d'évolution** : `WeightEvolutionChart.tsx`
   - ✅ **Présent** mais pas intégré dans `WeighingScreen`
   - **Fonctionnalités** :
     - Courbe d'évolution du poids individuel
     - Calcul du GMQ
     - Statistiques : poids initial, actuel, gain total
     - Commentaire évaluatif du GMQ (bon, moyen, faible)

#### ❌ Fonctionnalités manquantes

- ❌ **Écran de détail dédié** : Pas d'écran pour voir toutes les informations d'un animal
- ❌ Historique complet des pesées en tableau
- ❌ Métriques clés (poids actuel, poids initial, GMQ moyen, âge, objectif)
- ❌ Comparaison avec la moyenne du cheptel
- ❌ Objectif de poids avec progression
- ❌ Période ajustable du graphe
- ❌ Boutons d'action (nouvelle pesée, modifier objectif, exporter)

---

### D) GRAPHE D'ÉVOLUTION GLOBALE

#### ❌ Fonctionnalités manquantes

- ❌ Graphe montrant tous les animaux ensemble
- ❌ Courbes superposées (une par animal)
- ❌ Légende interactive (afficher/masquer animaux)
- ❌ Export PNG/PDF
- ❌ Comparaison avec moyenne du cheptel

**Note** : Le composant `TotalWeightEvolutionChart.tsx` existe mais n'est pas utilisé dans le menu pesées.

---

### E) CALCUL DU GMQ

#### ✅ Fonctionnalités présentes

1. **Calcul dans `WeightEvolutionChart`** (lignes 51-62)
   - **Formule** : `(gain_total_kg / nombre_jours) * 1000` → g/jour
   - **Période** : Entre première et dernière pesée
   - **Affichage** : En g/jour

2. **Service backend** : `PeseeRepository.calculateGMQ()` (lignes 149-179)
   - Endpoint : `/production/animaux/:animalId/gmq`
   - Fallback calcul côté client si endpoint indisponible

#### ❌ Fonctionnalités manquantes

- ❌ GMQ affiché dans la liste des animaux
- ❌ GMQ par intervalle entre pesées
- ❌ GMQ sur période spécifique
- ❌ Alerte si GMQ en baisse

---

### F) FONCTIONNALITÉS SUPPLÉMENTAIRES

#### ✅ Fonctionnalités présentes

- ✅ Bouton "Nouvelle pesée" (ligne 951)
- ✅ Rafraîchissement pull-to-refresh (ligne 692-698)
- ✅ Modal de création de pesée (`ProductionPeseeFormModal`)

#### ❌ Fonctionnalités manquantes

- ❌ Alerte si pesée en retard
- ❌ Notification si perte de poids détectée
- ❌ Comparaison avec standards de la race
- ❌ Export des données (CSV, Excel)
- ❌ Impression de rapports
- ❌ Écran de détail par animal

---

## 1.3 - ANALYSE DES CARTES CHEPTEL (Pour réutilisation)

### Composant identifié

- **Fichier** : `src/components/production/AnimalCard.tsx` (766 lignes)
- **Usage actuel** : Menu Cheptel (liste des animaux)

### Design de la carte

#### Structure
- **Layout** : Card avec padding medium
- **Header** : Photo + Code + Statut
- **Body** : Informations principales (race, sexe, poids, âge)
- **Footer** : Actions (éditer, supprimer, marketplace, etc.)

#### Informations affichées
- Photo de l'animal (si disponible)
- Code/ID
- Statut (avec badge coloré)
- Race
- Sexe
- **Poids actuel** (si disponible)
- Âge calculé
- Historique prophylaxie (expandable)

#### Props du composant
```typescript
interface AnimalCardProps {
  animal: ProductionAnimal;
  vaccinations?: Vaccination[];
  maladies?: Maladie[];
  traitements?: Traitement[];
  expandedHistorique?: string | null;
  onToggleHistorique?: (animalId: string) => void;
  onToggleMarketplace?: (animal: ProductionAnimal) => void;
  onEdit?: (animal: ProductionAnimal) => void;
  onDelete?: (animal: ProductionAnimal) => void;
  onChangeStatut?: (animal: ProductionAnimal, statut: StatutAnimal) => void;
  // ...
}
```

#### Variantes disponibles
- Compacte (mode liste)
- Détaillée (mode carte avec historique)
- Avec actions contextuelles

### Adaptations nécessaires pour contexte "suivi pesées"

Pour réutiliser `AnimalCard` dans le menu pesées, il faudrait :

1. **Ajouter props** :
   - `dernierePesee?: ProductionPesee`
   - `gmq?: number`
   - `enRetard?: boolean`
   - `onViewDetails?: () => void`
   - `onNouvellePesee?: () => void`

2. **Afficher en plus** :
   - Date de dernière pesée (format "Il y a X jours")
   - GMQ avec icône de tendance (↗️ ↘️)
   - Badge "En retard" si applicable
   - Bouton "Nouvelle pesée" au lieu de certaines actions cheptel

3. **Masquer/Adapter** :
   - Actions marketplace (si contexte pesées uniquement)
   - Certaines actions d'édition (selon contexte)

**Alternative** : Créer `SujetPeseeCard.tsx` qui réutilise le style mais adapté au contexte pesées.

---

## 1.4 - MATRICE DE COMPARAISON

| Fonctionnalité | Mode Bande | Mode Individuel | Action requise |
|----------------|------------|-----------------|----------------|
| **VUE D'ENSEMBLE** |
| Dashboard statistiques globales | ✅ Présent | ❌ Manquant | ✅ Créer |
| Graphe évolution poids moyen | ✅ Présent | ❌ Manquant | ✅ Créer |
| GMQ moyen du cheptel | ✅ Présent | ❌ Manquant | ✅ Créer |
| Nombre d'animaux en retard | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Date dernière pesée globale | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Taux objectifs atteints | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Période personnalisée (7j/30j/90j) | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| **LISTE DES SUJETS** |
| Liste sujets avec cartes | ✅ Présent (loges) | ❌ Manquant (animaux) | ✅ Créer (individuel) |
| Poids actuel par sujet | ✅ Présent | ⚠️ Partiel | ✅ Améliorer (individuel) |
| GMQ par sujet | ⚠️ Partiel (dans graphe) | ⚠️ Partiel (dans graphe) | ✅ Afficher dans cartes |
| Date dernière pesée | ✅ Présent | ✅ Présent | ✅ Harmoniser format |
| Badge "En retard" | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Tri/filtrage | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Recherche | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| **DÉTAILS D'UN SUJET** |
| Écran de détail dédié | ⚠️ Modal partielle | ❌ Manquant | ✅ Créer (individuel) |
| Graphe évolution individuelle | ✅ Présent | ✅ Présent | ✅ Harmoniser |
| Historique pesées (tableau) | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Métriques clés (poids, GMQ, âge) | ⚠️ Partiel | ❌ Manquant | ✅ Créer (individuel) |
| Objectif de poids avec progression | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Comparaison avec moyenne | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Période ajustable du graphe | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| **GRAPHE TOUS SUJETS** |
| Graphe courbes superposées | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Légende interactive | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Export PNG/PDF | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Zoom/pan | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| **CALCULS GMQ** |
| GMQ calculé correctement | ✅ Présent | ✅ Présent | ✅ Vérifier cohérence |
| GMQ affiché dans liste | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| GMQ par intervalle | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| GMQ période spécifique | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| **ALERTES & NOTIFICATIONS** |
| Alerte pesée en retard | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Notification perte poids | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Comparaison standards race | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| **EXPORT & RAPPORTS** |
| Export CSV/Excel | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Impression rapports | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |
| Export graphiques | ❌ Manquant | ❌ Manquant | ✅ Créer (les deux) |

---

## RÉSUMÉ ET PRIORITÉS

### Points forts du mode Bande

1. ✅ Dashboard global de la ferme bien structuré
2. ✅ Graphique d'évolution intégré
3. ✅ Sélecteur de loges avec expansion des détails
4. ✅ Modal de détails avec répartition par sujet

### Points faibles du mode Individuel

1. ❌ Pas de dashboard complet (seulement 2 statistiques simples)
2. ❌ Pas de liste des animaux avec leurs pesées
3. ❌ Pas d'écran de détail par animal
4. ❌ Pas de graphique d'évolution globale du cheptel

### Actions prioritaires pour harmonisation

#### Priorité 1 (Parité essentielle)
1. ✅ Créer dashboard complet pour mode individuel (comme mode bande)
2. ✅ Créer liste des animaux avec cartes (comme loges en mode bande)
3. ✅ Créer écran de détail par animal
4. ✅ Afficher GMQ dans les cartes animaux

#### Priorité 2 (Fonctionnalités avancées communes)
5. ✅ Badge "En retard" pour les deux modes
6. ✅ Tri/filtrage pour les deux modes
7. ✅ Historique pesées en tableau pour les deux modes
8. ✅ Graphe tous sujets superposés pour les deux modes

#### Priorité 3 (Améliorations UX)
9. ✅ Période personnalisée (7j/30j/90j)
10. ✅ Export données et graphiques
11. ✅ Alertes et notifications
12. ✅ Objectifs de poids avec progression

---

## PROCHAINES ÉTAPES

1. ✅ **Phase 1 terminée** : Analyse documentée
2. ⏭️ **Phase 2** : Architecture de la solution harmonisée
3. ⏭️ **Phase 3** : Implémentation
4. ⏭️ **Phase 4** : Tests de validation

---

**Document créé le** : 2025-01-10  
**Dernière mise à jour** : 2025-01-10

