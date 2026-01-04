# 📊 Intégration de la Performance Globale dans le Rapport Finance

## 📋 Objectif

Intégrer les informations sur la performance globale de production dans le rapport PDF Finance, incluant :
- Le coût moyen de production par kg sur la période choisie
- L'écart entre le coût de production et le prix du marché
- La marge réalisée
- Une analyse détaillée de tous ces coûts

## ✅ Modifications Apportées

### 1. Backend - Nouvelle Méthode de Calcul sur Période

**Fichier** : `backend/src/reports/reports.service.ts`

**Nouvelle méthode** : `calculerPerformanceGlobalePeriode(projetId, userId, dateDebut, dateFin)`

Cette méthode calcule la performance globale sur une période spécifique (au lieu de toute la période depuis la création du projet) :

- **Filtrage des données** : Les dépenses, charges fixes et ventes sont filtrées selon `dateDebut` et `dateFin`
- **Calcul OPEX** : Somme des dépenses OPEX ponctuelles + charges fixes (calculées selon leur fréquence pour la période)
- **Calcul CAPEX amorti** : Amortissement des dépenses CAPEX sur la période
- **Calcul kg vendus** : Somme des poids réels + estimation pour les ventes sans poids
- **Marge réalisée** : `ecart_absolu * total_kg_vendus_global` (nouveau champ ajouté)

**Retour** :
```typescript
{
  total_kg_vendus_global: number;
  total_opex_global: number;
  total_amortissement_capex_global: number;
  cout_kg_opex_global: number;
  cout_kg_complet_global: number;
  prix_kg_marche: number;
  ecart_absolu: number;
  ecart_pourcentage: number;
  marge_realisee: number; // NOUVEAU
  statut: 'rentable' | 'fragile' | 'perte';
  message_diagnostic: string;
  suggestions: string[];
  date_debut: string; // NOUVEAU
  date_fin: string; // NOUVEAU
}
```

### 2. Backend - Nouvel Endpoint API

**Fichier** : `backend/src/reports/reports.controller.ts`

**Nouvel endpoint** : `GET /reports/performance-globale/periode`

**Paramètres** :
- `projet_id` (requis) : ID du projet
- `date_debut` (requis) : Date de début de la période (ISO string)
- `date_fin` (requis) : Date de fin de la période (ISO string)

**Réponse** :
```typescript
{
  available: boolean;
  data: PerformanceGlobale | null;
  reason?: string;
  message?: string;
}
```

### 3. Frontend - Service de Performance Globale

**Fichier** : `src/services/PerformanceGlobaleService.ts`

**Modifications** :
- Extension de l'interface `PerformanceGlobale` pour inclure `marge_realisee`, `date_debut`, `date_fin`
- Nouvelle méthode `calculatePerformanceGlobalePeriode(projetId, dateDebut, dateFin, projet?)`

### 4. Frontend - Template PDF Finance

**Fichier** : `src/services/pdf/financePDF.ts`

**Modifications** :
- Extension de l'interface `FinanceData` pour inclure `performanceGlobale`, `dateDebut`, `dateFin`
- Ajout d'une nouvelle section "📊 Performance Globale de Production" dans le PDF avec :
  - **Indicateurs de coût** :
    - Coût moyen par kg (OPEX uniquement)
    - Coût moyen par kg (OPEX + CAPEX amorti)
    - Prix du marché (référence)
    - Écart (Prix marché - Coût complet) avec pourcentage
    - Marge réalisée sur la période
  - **Détails des coûts** :
    - Total OPEX (dépenses + charges fixes)
    - Total CAPEX amorti
    - Total coûts (OPEX + CAPEX)
    - Total kg vendus
  - **Diagnostic** : Message de diagnostic avec code couleur selon le statut (rentable/fragile/perte)
  - **Suggestions** : Liste des suggestions d'amélioration

### 5. Frontend - Composant FinanceGraphiquesComponent

**Fichier** : `src/components/FinanceGraphiquesComponent.tsx`

**Modifications** :
- Mise à jour de `handleExportPDF` pour :
  - Déterminer la période d'analyse (6 derniers mois ou depuis la création du projet)
  - Appeler `PerformanceGlobaleService.calculatePerformanceGlobalePeriode`
  - Passer les données de performance globale au template PDF

## 📊 Structure de la Section Performance Globale dans le PDF

La section "Performance Globale de Production" apparaît dans le rapport PDF avec :

1. **En-tête** : Titre + période analysée (si disponible)
2. **Indicateurs de coût** : Tableau avec les coûts par kg, prix du marché, écart et marge
3. **Détails des coûts** : Tableau avec le détail OPEX, CAPEX et kg vendus
4. **Diagnostic** : Carte colorée avec le message de diagnostic
5. **Suggestions** : Liste à puces des suggestions d'amélioration

## 🎨 Codes Couleur

- **Rentable** : Vert (`#2E7D32`, fond `#e8f5e9`)
- **Fragile** : Orange (`#FF9800`, fond `#fff3e0`)
- **Perte** : Rouge (`#C62828`, fond `#ffebee`)

## 🔄 Flux de Données

1. L'utilisateur clique sur "Exporter PDF" dans l'écran Finance
2. Le frontend détermine la période (6 derniers mois ou depuis création)
3. Le frontend appelle `PerformanceGlobaleService.calculatePerformanceGlobalePeriode`
4. Le backend calcule la performance globale pour la période
5. Le frontend génère le PDF avec toutes les données, incluant la performance globale
6. Le PDF est partagé avec l'utilisateur

## 📝 Notes Techniques

- Si les données de performance globale ne sont pas disponibles (pas assez de ventes), la section n'apparaît pas dans le PDF
- La période par défaut est de 6 mois, mais s'ajuste si le projet est plus récent
- Les calculs incluent l'estimation du poids vendu si `poids_kg` est NULL dans les ventes
- Les charges fixes sont calculées selon leur fréquence (mensuel, trimestriel, annuel) pour la période

## ✅ Tests Recommandés

1. Générer un rapport PDF avec des données de performance globale disponibles
2. Vérifier que tous les indicateurs sont correctement affichés
3. Vérifier que les codes couleur correspondent au statut
4. Générer un rapport PDF sans données de performance globale (pas de ventes)
5. Vérifier que le PDF se génère correctement même sans la section performance globale

---

**Date d'implémentation** : 2025-01-XX
**Statut** : ✅ Implémentation complète

