# 📋 Liste des Tâches - Fermier Pro

## ✅ Modules Complétés

### 1. Module Projet ✅
- [x] Création de projet (CreateProjectScreen)
- [x] Slice Redux (projetSlice)
- [x] Table base de données (projets)
- [x] Dashboard avec statistiques

### 2. Module Finance ✅
- [x] Charges fixes (CRUD complet)
- [x] Dépenses ponctuelles avec photos
- [x] Graphiques comparatifs
- [x] Vue d'ensemble financière

### 3. Module Reproduction ✅
- [x] Gestion des gestations
- [x] Calendrier des gestations
- [x] Gestion des sevrages
- [x] Table gestations et sevrages

### 4. Module Nutrition ✅
- [x] Calculateur de rations
- [x] Gestion des ingrédients
- [x] Historique des rations
- [x] Tables rations et ingredients

### 5. Module Rapports ✅ (Partiellement)
- [x] Indicateurs de performance
- [x] Calcul du coût de production
- [x] Recommandations automatiques
- [ ] Rapports de croissance (composant manquant)
- [ ] Export PDF des rapports
- [ ] Graphiques d'évolution temporelle

---

## ❌ Modules Non Implémentés

### 6. Module Mortalités ❌
**État actuel :** Écran placeholder uniquement

**À faire :**
- [ ] Créer table `mortalites` dans database.ts
- [ ] Créer types TypeScript (`src/types/mortalites.ts`)
- [ ] Créer slice Redux (`src/store/slices/mortalitesSlice.ts`)
- [ ] Créer composant `MortalitesListComponent.tsx`
- [ ] Créer composant `MortalitesFormModal.tsx`
- [ ] Intégrer dans `MortalitesScreen.tsx`
- [ ] Ajouter méthodes CRUD dans `database.ts`
- [ ] Ajouter graphiques de mortalité par période
- [ ] Calculer le taux de mortalité automatique

**Structure table mortalites :**
```sql
CREATE TABLE IF NOT EXISTS mortalites (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL,
  nombre_porcs INTEGER NOT NULL,
  date TEXT NOT NULL,
  cause TEXT,
  categorie TEXT CHECK (categorie IN ('porcelet', 'truie', 'verrat', 'autre')),
  notes TEXT,
  date_creation TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projet_id) REFERENCES projets(id)
);
```

### 7. Module Planification ❌
**État actuel :** Écran placeholder uniquement

**À faire :**
- [ ] Définir les besoins de planification
- [ ] Créer table `planifications` ou `taches` dans database.ts
- [ ] Créer types TypeScript (`src/types/planification.ts`)
- [ ] Créer slice Redux (`src/store/slices/planificationSlice.ts`)
- [ ] Créer composant `PlanificationCalendarComponent.tsx`
- [ ] Créer composant `TachesListComponent.tsx`
- [ ] Créer composant `TacheFormModal.tsx`
- [ ] Intégrer dans `PlanificationScreen.tsx`
- [ ] Ajouter alertes et notifications
- [ ] Intégrer avec le calendrier des gestations

**Fonctionnalités suggérées :**
- Planification des saillies
- Rappels pour vaccinations
- Planification des sevrages
- Tâches récurrentes (nettoyage, alimentation, etc.)

### 8. Module Collaboration ❌
**État actuel :** Écran placeholder uniquement

**À faire :**
- [ ] Définir les besoins de collaboration
- [ ] Créer table `utilisateurs` et `collaborations` dans database.ts
- [ ] Créer types TypeScript (`src/types/collaboration.ts`)
- [ ] Créer slice Redux (`src/store/slices/collaborationSlice.ts`)
- [ ] Créer composant `CollaborateursListComponent.tsx`
- [ ] Créer composant `InvitationFormModal.tsx`
- [ ] Intégrer dans `CollaborationScreen.tsx`
- [ ] Gérer les permissions (lecture/écriture)
- [ ] Synchronisation multi-utilisateurs (si backend ajouté)

**Fonctionnalités suggérées :**
- Invitation de collaborateurs
- Partage de projet
- Gestion des rôles et permissions
- Historique des actions par collaborateur

### 9. Module Paramètres ❌
**État actuel :** Écran placeholder uniquement

**À faire :**
- [ ] Créer composant `ParametresProjetComponent.tsx`
- [ ] Créer composant `ParametresAppComponent.tsx`
- [ ] Créer composant `ParametresNotificationsComponent.tsx`
- [ ] Intégrer dans `ParametresScreen.tsx` avec onglets
- [ ] Ajouter gestion du profil utilisateur
- [ ] Ajouter préférences d'affichage
- [ ] Ajouter paramètres de notifications
- [ ] Ajouter export/import de données
- [ ] Ajouter gestion de la base de données (backup, reset)

**Fonctionnalités suggérées :**
- Modifier le projet actif
- Changer de projet
- Exporter les données
- Sauvegarder/restaurer
- Paramètres de notifications
- Thème (clair/sombre)

---

## 🔧 Améliorations à Faire

### Module Rapports (Améliorations)
- [ ] Ajouter onglets dans `ReportsScreen.tsx` :
  - Onglet "Performance" (actuel)
  - Onglet "Croissance" (nouveau)
  - Onglet "Historique" (nouveau)
- [ ] Créer `CroissanceReportsComponent.tsx` :
  - Liste des rapports de croissance
  - Formulaire de création de rapport
  - Graphiques d'évolution du poids
  - Calcul du gain quotidien moyen
- [ ] Créer `ReportsHistoryComponent.tsx` :
  - Historique des rapports
  - Filtres par date
  - Comparaisons périodiques
- [ ] Ajouter export PDF :
  - Utiliser `react-native-pdf` ou `expo-print`
  - Générer rapports personnalisés
  - Inclure graphiques et statistiques

### Module Dashboard (Améliorations)
- [ ] Ajouter graphiques de tendances
- [ ] Ajouter alertes importantes (gestations proches, mortalités élevées)
- [ ] Ajouter vue rapide des dépenses du mois
- [ ] Ajouter indicateurs clés (KPIs)
- [ ] Ajouter liens rapides vers actions courantes

### Base de Données
- [ ] Vérifier et optimiser les index
- [ ] Ajouter migrations pour futures mises à jour
- [ ] Ajouter backup automatique
- [ ] Ajouter vérification d'intégrité

### Authentification (Futur)
- [ ] Créer système d'authentification
- [ ] Gérer les sessions utilisateurs
- [ ] Remplacer `proprietaire_id: 'user_1'` par vraie authentification
- [ ] Ajouter gestion des mots de passe

### Tests
- [ ] Ajouter tests unitaires pour les slices Redux
- [ ] Ajouter tests pour les services de base de données
- [ ] Ajouter tests d'intégration pour les composants principaux

---

## 📊 Priorités Suggérées

### Priorité Haute 🔴
1. **Module Mortalités** - Essentiel pour le suivi complet
2. **Améliorer Module Rapports** - Ajouter rapports de croissance
3. **Module Paramètres** - Notamment gestion du projet et export

### Priorité Moyenne 🟡
4. **Module Planification** - Utile pour l'organisation
5. **Améliorer Dashboard** - Meilleure vue d'ensemble
6. **Tests** - Assurer la qualité

### Priorité Basse 🟢
7. **Module Collaboration** - Fonctionnalité avancée
8. **Authentification** - Si multi-utilisateurs requis
9. **Export PDF** - Fonctionnalité bonus

---

## 🐛 Bugs et Corrections

### Connus
- [x] ✅ Erreur TypeScript dans `PerformanceIndicatorsComponent.tsx` (corrigé)
- [ ] Vérifier calculs de coût de production pour cohérence
- [ ] Vérifier gestion des dates dans les graphiques
- [ ] Vérifier upload de photos pour dépenses ponctuelles

---

## 📝 Notes Techniques

### Dépendances manquantes potentielles
- Pour export PDF : `expo-print` ou `react-native-pdf`
- Pour notifications : `expo-notifications`
- Pour partage : `expo-sharing`

### Architecture actuelle
- Redux Toolkit avec Redux Persist ✅
- SQLite avec expo-sqlite ✅
- React Navigation (Stack + Bottom Tabs + Material Top Tabs) ✅
- TypeScript ✅

---

*Dernière mise à jour : Après correction de PerformanceIndicatorsComponent*

