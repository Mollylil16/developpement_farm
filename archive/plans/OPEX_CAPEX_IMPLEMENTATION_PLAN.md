# 📊 Plan d'Implémentation - Système OPEX/CAPEX avec Amortissement

**Date:** 21 Novembre 2025  
**Objectif:** Implémenter un système complet de gestion OPEX/CAPEX avec calcul automatique des coûts de production et marges

---

## 🎯 Résumé des Exigences

### Concepts Clés
1. **OPEX (Operational Expenditure)** : Dépenses opérationnelles courantes
2. **CAPEX (Capital Expenditure)** : Investissements amortis sur plusieurs années
3. **Amortissement** : Répartition du coût CAPEX sur une durée (définie globalement)
4. **Coût de production** : Intègre OPEX + amortissement CAPEX
5. **Marge** : Différence entre prix de vente et coût réel

### Principes
- ✅ **Automatique** : La catégorie détermine OPEX/CAPEX
- ✅ **Paramètre global** : Une seule durée d'amortissement pour tous les CAPEX
- ✅ **Transparence** : Double calcul (OPEX seul vs Complet)
- ✅ **UX simple** : Pas de saisie supplémentaire pour l'utilisateur

---

## 📋 Phase 1 : Extension des Types & Catégories

### 1.1 Nouvelles Catégories de Dépenses (CAPEX)

**Fichier:** `src/types/finance.ts`

```typescript
export type CategorieDepense =
  // OPEX (existantes)
  | 'vaccins'
  | 'medicaments'
  | 'alimentation'
  | 'veterinaire'
  | 'entretien'
  | 'equipements'      // ⚠️ Déjà existant - reste OPEX si petit équipement
  | 'autre'
  // CAPEX (nouvelles)
  | 'investissement'           // Investissements généraux
  | 'equipement_lourd'         // Matériel agricole, machines
  | 'amenagement_batiment'     // Construction, rénovation
  | 'infrastructure'           // Clôtures, système eau, électricité
  | 'vehicule';                // Véhicules, tracteurs

// Classifier automatiquement OPEX vs CAPEX
export const CATEGORIES_CAPEX: CategorieDepense[] = [
  'investissement',
  'equipement_lourd',
  'amenagement_batiment',
  'infrastructure',
  'vehicule',
];

export function isCapex(categorie: CategorieDepense): boolean {
  return CATEGORIES_CAPEX.includes(categorie);
}

export function getTypeDepense(categorie: CategorieDepense): 'OPEX' | 'CAPEX' {
  return isCapex(categorie) ? 'CAPEX' : 'OPEX';
}
```

### 1.2 Labels des Catégories

```typescript
export const CATEGORIE_DEPENSE_LABELS: Record<CategorieDepense, string> = {
  // OPEX
  vaccins: 'Vaccins & Prophylaxie',
  medicaments: 'Médicaments',
  alimentation: 'Alimentation',
  veterinaire: 'Services vétérinaires',
  entretien: 'Entretien & Maintenance',
  equipements: 'Équipements courants',
  autre: 'Autre',
  // CAPEX
  investissement: '💰 Investissement',
  equipement_lourd: '🚜 Équipement lourd',
  amenagement_batiment: '🏗️ Aménagement bâtiment',
  infrastructure: '🔧 Infrastructure',
  vehicule: '🚗 Véhicule',
};
```

---

## 📋 Phase 2 : Paramètres Globaux

### 2.1 Type Paramètres Projet

**Fichier:** `src/types/projet.ts`

```typescript
export interface ParametresProjet {
  id: string;
  projet_id: string;
  
  // Paramètres OPEX/CAPEX
  duree_amortissement_par_defaut_mois: number; // Défaut: 36 mois (3 ans)
  
  // Autres paramètres existants...
  duree_gestation_jours: number;
  duree_lactation_jours: number;
  // ...
}

export const DEFAULT_PARAMETRES: Partial<ParametresProjet> = {
  duree_amortissement_par_defaut_mois: 36, // 3 ans par défaut
  duree_gestation_jours: 114,
  duree_lactation_jours: 21,
  // ...
};
```

### 2.2 Migration Database

**Fichier:** `src/database/migrations/add_amortissement_params.ts`

```sql
-- Migration : Ajouter paramètre d'amortissement
ALTER TABLE parametres_projet 
ADD COLUMN duree_amortissement_par_defaut_mois INTEGER DEFAULT 36;
```

---

## 📋 Phase 3 : Fonctions Utilitaires de Calcul

### 3.1 Utilitaires OPEX/CAPEX

**Fichier:** `src/utils/financeCalculations.ts` (NOUVEAU)

```typescript
import { DepensePonctuelle, CategorieDepense } from '../types';
import { isCapex } from '../types/finance';

/**
 * Calcule l'amortissement mensuel d'une dépense CAPEX
 */
export function getAmortissementMensuel(
  depense: DepensePonctuelle,
  dureeAmortissementMois: number
): number {
  if (!isCapex(depense.categorie)) {
    return 0; // Pas d'amortissement pour OPEX
  }
  return depense.montant / dureeAmortissementMois;
}

/**
 * Calcule le total des OPEX sur une période
 */
export function calculateTotalOpex(
  depenses: DepensePonctuelle[],
  dateDebut: Date,
  dateFin: Date
): number {
  return depenses
    .filter((d) => !isCapex(d.categorie))
    .filter((d) => {
      const dateDepense = new Date(d.date);
      return dateDepense >= dateDebut && dateDepense <= dateFin;
    })
    .reduce((sum, d) => sum + d.montant, 0);
}

/**
 * Calcule le total des amortissements CAPEX sur une période
 */
export function calculateTotalAmortissementCapex(
  depenses: DepensePonctuelle[],
  dateDebut: Date,
  dateFin: Date,
  dureeAmortissementMois: number
): number {
  const moisPeriode = getMonthsBetween(dateDebut, dateFin);
  
  return depenses
    .filter((d) => isCapex(d.categorie))
    .filter((d) => {
      // Inclure les CAPEX qui sont encore en cours d'amortissement
      const dateDepense = new Date(d.date);
      const finAmortissement = addMonths(dateDepense, dureeAmortissementMois);
      return dateDepense <= dateFin && finAmortissement >= dateDebut;
    })
    .reduce((sum, d) => {
      const amortissementMensuel = getAmortissementMensuel(d, dureeAmortissementMois);
      // Calculer combien de mois de la période sont couverts
      const moisActifs = getMoisActifsAmortissement(d, dateDebut, dateFin, dureeAmortissementMois);
      return sum + (amortissementMensuel * moisActifs);
    }, 0);
}

/**
 * Calcule le coût de production par kg (OPEX seulement)
 */
export function calculateCoutKgOpex(
  totalOpex: number,
  totalKgVendus: number
): number {
  if (totalKgVendus === 0) return 0;
  return totalOpex / totalKgVendus;
}

/**
 * Calcule le coût de production par kg (OPEX + CAPEX amorti)
 */
export function calculateCoutKgComplet(
  totalOpex: number,
  totalAmortissementCapex: number,
  totalKgVendus: number
): number {
  if (totalKgVendus === 0) return 0;
  return (totalOpex + totalAmortissementCapex) / totalKgVendus;
}

// Fonctions helper
function getMonthsBetween(dateDebut: Date, dateFin: Date): number {
  // ...
}

function getMoisActifsAmortissement(
  depense: DepensePonctuelle,
  dateDebut: Date,
  dateFin: Date,
  dureeAmortissementMois: number
): number {
  // Calcule combien de mois dans la période sont couverts par l'amortissement
  // ...
}
```

### 3.2 Calculs de Marge par Vente

**Fichier:** `src/utils/margeCalculations.ts` (NOUVEAU)

```typescript
import { Revenu } from '../types';

export interface MargeVente {
  // Données de base
  poids_kg: number;
  prix_vente: number;
  
  // Coûts
  cout_kg_opex: number;
  cout_kg_complet: number;
  cout_reel_opex: number;
  cout_reel_complet: number;
  
  // Marges
  marge_opex: number;
  marge_complete: number;
  marge_opex_pourcent: number;
  marge_complete_pourcent: number;
  
  // Indicateur visuel
  statut_marge: 'negative' | 'faible' | 'confortable';
}

/**
 * Calcule toutes les marges pour une vente de porc
 */
export function calculateMargeVente(
  vente: Revenu,
  poids_kg: number,
  cout_kg_opex: number,
  cout_kg_complet: number
): MargeVente {
  const prix_vente = vente.montant;
  
  // Coûts réels
  const cout_reel_opex = poids_kg * cout_kg_opex;
  const cout_reel_complet = poids_kg * cout_kg_complet;
  
  // Marges en valeur
  const marge_opex = prix_vente - cout_reel_opex;
  const marge_complete = prix_vente - cout_reel_complet;
  
  // Marges en %
  const marge_opex_pourcent = prix_vente > 0 ? (marge_opex / prix_vente) * 100 : 0;
  const marge_complete_pourcent = prix_vente > 0 ? (marge_complete / prix_vente) * 100 : 0;
  
  // Statut de la marge
  const statut_marge = getStatutMarge(marge_complete_pourcent);
  
  return {
    poids_kg,
    prix_vente,
    cout_kg_opex,
    cout_kg_complet,
    cout_reel_opex,
    cout_reel_complet,
    marge_opex,
    marge_complete,
    marge_opex_pourcent,
    marge_complete_pourcent,
    statut_marge,
  };
}

function getStatutMarge(margePourcent: number): 'negative' | 'faible' | 'confortable' {
  if (margePourcent < 0) return 'negative';
  if (margePourcent < 15) return 'faible';
  return 'confortable';
}

export function getMargeColor(statut: 'negative' | 'faible' | 'confortable'): string {
  switch (statut) {
    case 'negative': return '#EF4444'; // Rouge
    case 'faible': return '#F59E0B'; // Orange
    case 'confortable': return '#10B981'; // Vert
  }
}
```

---

## 📋 Phase 4 : Extension du Modèle de Données

### 4.1 Type Revenu Étendu

**Fichier:** `src/types/finance.ts`

```typescript
export interface Revenu {
  id: string;
  projet_id: string;
  montant: number;
  categorie: CategorieRevenu;
  libelle_categorie?: string;
  date: string;
  description?: string;
  commentaire?: string;
  photos?: string[];
  date_creation: string;
  
  // ✨ NOUVEAUX CHAMPS pour ventes de porcs
  poids_kg?: number;                    // Poids du porc vendu
  cout_kg_opex?: number;                // Coût OPEX par kg au moment de la vente
  cout_kg_complet?: number;             // Coût complet par kg au moment de la vente
  cout_reel_opex?: number;              // Coût réel OPEX du porc
  cout_reel_complet?: number;           // Coût réel complet du porc
  marge_opex?: number;                  // Marge OPEX en valeur
  marge_complete?: number;              // Marge complète en valeur
  marge_opex_pourcent?: number;         // Marge OPEX en %
  marge_complete_pourcent?: number;     // Marge complète en %
}
```

### 4.2 Migration Database - Revenus

```sql
-- Migration : Ajouter champs de coûts et marges aux revenus
ALTER TABLE revenus ADD COLUMN poids_kg REAL;
ALTER TABLE revenus ADD COLUMN cout_kg_opex REAL;
ALTER TABLE revenus ADD COLUMN cout_kg_complet REAL;
ALTER TABLE revenus ADD COLUMN cout_reel_opex REAL;
ALTER TABLE revenus ADD COLUMN cout_reel_complet REAL;
ALTER TABLE revenus ADD COLUMN marge_opex REAL;
ALTER TABLE revenus ADD COLUMN marge_complete REAL;
ALTER TABLE revenus ADD COLUMN marge_opex_pourcent REAL;
ALTER TABLE revenus ADD COLUMN marge_complete_pourcent REAL;
```

---

## 📋 Phase 5 : Service de Calcul Centralisé

### 5.1 Service CoutProductionService

**Fichier:** `src/services/CoutProductionService.ts` (NOUVEAU)

```typescript
import { DepensePonctuelle, Revenu, ParametresProjet } from '../types';
import {
  calculateTotalOpex,
  calculateTotalAmortissementCapex,
  calculateCoutKgOpex,
  calculateCoutKgComplet,
} from '../utils/financeCalculations';

export interface CoutProductionPeriode {
  dateDebut: Date;
  dateFin: Date;
  total_opex: number;
  total_amortissement_capex: number;
  total_kg_vendus: number;
  cout_kg_opex: number;
  cout_kg_complet: number;
}

class CoutProductionService {
  /**
   * Calcule les coûts de production pour une période donnée
   */
  async calculateCoutsPeriode(
    projetId: string,
    dateDebut: Date,
    dateFin: Date,
    parametres: ParametresProjet
  ): Promise<CoutProductionPeriode> {
    // 1. Charger toutes les dépenses
    const depenses = await this.loadDepenses(projetId);
    
    // 2. Charger toutes les ventes (revenus de type vente_porc)
    const ventes = await this.loadVentesPorc(projetId, dateDebut, dateFin);
    
    // 3. Calculer les totaux
    const total_opex = calculateTotalOpex(depenses, dateDebut, dateFin);
    const total_amortissement_capex = calculateTotalAmortissementCapex(
      depenses,
      dateDebut,
      dateFin,
      parametres.duree_amortissement_par_defaut_mois
    );
    const total_kg_vendus = ventes.reduce((sum, v) => sum + (v.poids_kg || 0), 0);
    
    // 4. Calculer les coûts par kg
    const cout_kg_opex = calculateCoutKgOpex(total_opex, total_kg_vendus);
    const cout_kg_complet = calculateCoutKgComplet(
      total_opex,
      total_amortissement_capex,
      total_kg_vendus
    );
    
    return {
      dateDebut,
      dateFin,
      total_opex,
      total_amortissement_capex,
      total_kg_vendus,
      cout_kg_opex,
      cout_kg_complet,
    };
  }
  
  /**
   * Met à jour les marges d'une vente
   */
  async updateMargesVente(
    vente: Revenu,
    poids_kg: number,
    coutsPeriode: CoutProductionPeriode
  ): Promise<Revenu> {
    const marges = calculateMargeVente(
      vente,
      poids_kg,
      coutsPeriode.cout_kg_opex,
      coutsPeriode.cout_kg_complet
    );
    
    // Mise à jour de l'objet vente avec les calculs
    const venteUpdated: Revenu = {
      ...vente,
      poids_kg: marges.poids_kg,
      cout_kg_opex: marges.cout_kg_opex,
      cout_kg_complet: marges.cout_kg_complet,
      cout_reel_opex: marges.cout_reel_opex,
      cout_reel_complet: marges.cout_reel_complet,
      marge_opex: marges.marge_opex,
      marge_complete: marges.marge_complete,
      marge_opex_pourcent: marges.marge_opex_pourcent,
      marge_complete_pourcent: marges.marge_complete_pourcent,
    };
    
    // Sauvegarder en DB
    await this.saveRevenu(venteUpdated);
    
    return venteUpdated;
  }
  
  // Méthodes privées...
  private async loadDepenses(projetId: string): Promise<DepensePonctuelle[]> { /* ... */ }
  private async loadVentesPorc(projetId: string, dateDebut: Date, dateFin: Date): Promise<Revenu[]> { /* ... */ }
  private async saveRevenu(revenu: Revenu): Promise<void> { /* ... */ }
}

export default new CoutProductionService();
```

---

## 📋 Phase 6 : Modifications UI

### 6.1 Dashboard - Nouveaux Indicateurs

**Fichier:** `src/components/DashboardMainWidgets.tsx`

Ajouter des cartes :

```tsx
{/* Coût de Production OPEX */}
<StatCard
  icon="💰"
  title="Coût/kg (OPEX)"
  value={`${coutKgOpex.toFixed(2)} €`}
  subtitle="Dépenses opérationnelles"
  color={colors.info}
/>

{/* Coût de Production Complet */}
<StatCard
  icon="📊"
  title="Coût/kg (Complet)"
  value={`${coutKgComplet.toFixed(2)} €`}
  subtitle="OPEX + Amortissement"
  color={colors.primary}
/>

{/* Marge Moyenne */}
<StatCard
  icon="📈"
  title="Marge Moyenne"
  value={`${margeCompleteMoyenne.toFixed(1)} %`}
  subtitle={getMargeLabel(margeCompleteMoyenne)}
  color={getMargeColor(getStatutMarge(margeCompleteMoyenne))}
/>
```

### 6.2 Fiche Vente de Porc

**Fichier:** `src/components/VenteDetailModal.tsx` (NOUVEAU ou modifier existant)

```tsx
<View style={styles.section}>
  <Text style={styles.sectionTitle}>💰 Informations de Vente</Text>
  
  <InfoRow label="Poids" value={`${vente.poids_kg} kg`} />
  <InfoRow label="Prix de vente" value={`${vente.montant.toFixed(2)} €`} />
</View>

<View style={styles.section}>
  <Text style={styles.sectionTitle}>📊 Coûts de Production</Text>
  
  <InfoRow 
    label="Coût OPEX/kg" 
    value={`${vente.cout_kg_opex?.toFixed(2)} €`} 
  />
  <InfoRow 
    label="Coût Complet/kg" 
    value={`${vente.cout_kg_complet?.toFixed(2)} €`} 
  />
  
  <Separator />
  
  <InfoRow 
    label="Coût réel OPEX" 
    value={`${vente.cout_reel_opex?.toFixed(2)} €`} 
    bold 
  />
  <InfoRow 
    label="Coût réel Complet" 
    value={`${vente.cout_reel_complet?.toFixed(2)} €`} 
    bold 
  />
</View>

<View style={styles.section}>
  <Text style={styles.sectionTitle}>📈 Marges</Text>
  
  <MargeRow 
    label="Marge OPEX" 
    valeur={vente.marge_opex}
    pourcent={vente.marge_opex_pourcent}
  />
  
  <MargeRow 
    label="Marge Complète" 
    valeur={vente.marge_complete}
    pourcent={vente.marge_complete_pourcent}
    statut={getStatutMarge(vente.marge_complete_pourcent)}
    bold
  />
</View>
```

### 6.3 Paramètres - Durée d'Amortissement

**Fichier:** `src/components/ParametresProjetComponent.tsx`

```tsx
<View style={styles.section}>
  <Text style={styles.sectionTitle}>💰 OPEX / CAPEX</Text>
  
  <FormField
    label="Durée d'amortissement (mois)"
    value={parametres.duree_amortissement_par_defaut_mois.toString()}
    onChangeText={(value) => handleChange('duree_amortissement_par_defaut_mois', parseInt(value) || 36)}
    keyboardType="numeric"
    placeholder="36"
    helper="Durée sur laquelle les investissements (CAPEX) sont amortis. Défaut: 36 mois (3 ans)"
  />
  
  <Text style={styles.helper}>
    Les investissements (équipements lourds, aménagements, etc.) seront 
    automatiquement amortis sur cette durée dans le calcul des coûts de production.
  </Text>
</View>
```

---

## 📋 Phase 7 : Fichiers à Modifier/Créer

### Fichiers à Créer (6)
1. ✅ `src/utils/financeCalculations.ts`
2. ✅ `src/utils/margeCalculations.ts`
3. ✅ `src/services/CoutProductionService.ts`
4. ✅ `src/database/migrations/add_opex_capex_fields.ts`
5. ✅ `src/components/VenteDetailModal.tsx`
6. ✅ `OPEX_CAPEX_IMPLEMENTATION_PLAN.md` (ce fichier)

### Fichiers à Modifier (10)
1. ✅ `src/types/finance.ts` - Ajouter catégories CAPEX + fonctions helper
2. ✅ `src/types/projet.ts` - Ajouter durée_amortissement_par_defaut_mois
3. ✅ `src/services/database.ts` - Migrations tables
4. ✅ `src/database/repositories/FinanceRepository.ts` - Requêtes OPEX/CAPEX
5. ✅ `src/store/slices/financeSlice.ts` - Actions calcul coûts
6. ✅ `src/components/DashboardMainWidgets.tsx` - Afficher coûts/kg
7. ✅ `src/components/DepenseFormModal.tsx` - Afficher type OPEX/CAPEX
8. ✅ `src/components/FinanceGraphiquesComponent.tsx` - Graphiques OPEX/CAPEX
9. ✅ `src/components/ParametresProjetComponent.tsx` - Paramètre amortissement
10. ✅ `src/components/RevenuFormModal.tsx` - Champ poids pour ventes porcs

---

## 🎯 Ordre d'Implémentation

### Étape 1 : Fondations (Types & Utils) ⚡
1. Modifier `src/types/finance.ts` - Catégories + fonctions
2. Modifier `src/types/projet.ts` - Paramètre amortissement
3. Créer `src/utils/financeCalculations.ts`
4. Créer `src/utils/margeCalculations.ts`

### Étape 2 : Base de Données 🗄️
5. Créer migration `add_opex_capex_fields.ts`
6. Modifier `src/services/database.ts` - Exécuter migration
7. Modifier `src/database/repositories/FinanceRepository.ts`

### Étape 3 : Services & Logique Métier 🧠
8. Créer `src/services/CoutProductionService.ts`
9. Modifier `src/store/slices/financeSlice.ts` - Thunks calculs

### Étape 4 : Interface Utilisateur 🎨
10. Modifier `src/components/ParametresProjetComponent.tsx`
11. Modifier `src/components/DepenseFormModal.tsx`
12. Modifier `src/components/RevenuFormModal.tsx`
13. Modifier `src/components/DashboardMainWidgets.tsx`
14. Créer `src/components/VenteDetailModal.tsx`
15. Modifier `src/components/FinanceGraphiquesComponent.tsx`

---

## ✅ Critères de Succès

### Fonctionnels
- ✅ Les dépenses sont automatiquement classées OPEX/CAPEX selon catégorie
- ✅ Un paramètre global contrôle la durée d'amortissement
- ✅ Les coûts par kg intègrent OPEX + amortissement CAPEX
- ✅ Les marges sont calculées automatiquement à chaque vente
- ✅ Le dashboard affiche les coûts/kg et marges moyennes

### Techniques
- ✅ Migrations DB sans perte de données
- ✅ Calculs optimisés et cachés
- ✅ Types TypeScript complets
- ✅ Tests unitaires des fonctions de calcul

### UX
- ✅ Pas de complexité ajoutée pour l'utilisateur
- ✅ Affichage clair des marges avec code couleur
- ✅ Paramètre d'amortissement facilement modifiable
- ✅ Visibilité transparente OPEX vs Complet

---

## 📊 Exemple de Calcul

### Données
- **OPEX mois M** : 10 000 €
- **CAPEX investis** :
  - Tracteur (20 000 €, acheté il y a 6 mois)
  - Bâtiment (50 000 €, acheté il y a 12 mois)
- **Durée amortissement** : 36 mois
- **Kg vendus mois M** : 2 000 kg

### Calculs
```
Amortissement tracteur = 20 000 / 36 = 555,56 €/mois
Amortissement bâtiment = 50 000 / 36 = 1 388,89 €/mois
Total amortissement = 1 944,45 €/mois

Coût/kg OPEX = 10 000 / 2 000 = 5,00 €/kg
Coût/kg Complet = (10 000 + 1 944,45) / 2 000 = 5,97 €/kg
```

### Vente d'un porc (120 kg, 900 €)
```
Coût réel OPEX = 120 * 5,00 = 600 €
Coût réel Complet = 120 * 5,97 = 716,40 €

Marge OPEX = 900 - 600 = 300 € (33,3%)
Marge Complète = 900 - 716,40 = 183,60 € (20,4%)
→ Statut : confortable ✅ (vert)
```

---

## 🚀 Prochaines Étapes

1. **Valider le plan** avec l'équipe
2. **Créer une branche** `feature/opex-capex-system`
3. **Implémenter étape par étape**
4. **Tester** chaque phase avant de passer à la suivante
5. **Documenter** dans le code
6. **Former** les utilisateurs

---

**Date de création:** 21 Novembre 2025  
**Version:** 1.0  
**Statut:** 📋 Plan prêt - En attente d'approbation

Cette implémentation transformera la gestion financière en fournissant une visibilité complète sur les coûts réels et les marges ! 💰📊✨

