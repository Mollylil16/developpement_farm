# 📝 Guide d'Intégration OPEX/CAPEX

**Date:** 21 Novembre 2025  
**Status:** ✅ Phases 1-3 complétées - Phase 4 en cours

---

## ✅ Phases Complétées

### Phase 1 : Types & Catégories ✅
**Fichiers modifiés:**
- ✅ `src/types/finance.ts` - Ajout 5 catégories CAPEX + fonctions helper
- ✅ `src/types/projet.ts` - Ajout `duree_amortissement_par_defaut_mois`

### Phase 2 : Paramètres ✅
- ✅ Constante `DEFAULT_DUREE_AMORTISSEMENT_MOIS = 36`
- ✅ Champ dans interface `Projet`

### Phase 3 : Utilitaires ✅
**Fichiers créés:**
- ✅ `src/utils/financeCalculations.ts` - Calculs OPEX/CAPEX/amortissement
- ✅ `src/utils/margeCalculations.ts` - Calculs marges et statistiques

---

## 🔄 Phase 4 : Database (EN COURS)

### Fichier de Migration Créé
✅ `src/database/migrations/add_opex_capex_fields.ts`

**Ce que fait la migration:**
1. Ajoute `duree_amortissement_par_defaut_mois` à la table `projets` (défaut: 36 mois)
2. Ajoute 9 nouveaux champs à la table `revenus`:
   - `poids_kg` - Poids du porc vendu
   - `cout_kg_opex` - Coût OPEX par kg
   - `cout_kg_complet` - Coût complet par kg
   - `cout_reel_opex` - Coût réel OPEX
   - `cout_reel_complet` - Coût réel complet
   - `marge_opex` - Marge OPEX en FCFA
   - `marge_complete` - Marge complète en FCFA
   - `marge_opex_pourcent` - Marge OPEX en %
   - `marge_complete_pourcent` - Marge complète en %

### ⚠️ Action Requise : Intégrer la Migration

**Ajouter dans `src/services/database.ts` à la fin de `migrateTables()`:**

```typescript
// Migration: OPEX/CAPEX - Ajout champs amortissement et marges
try {
  const { migrateOpexCapexFields, isOpexCapexMigrationApplied } = await import('../database/migrations/add_opex_capex_fields');
  const migrationApplied = await isOpexCapexMigrationApplied(this.db);
  
  if (!migrationApplied) {
    console.log('🔄 Application de la migration OPEX/CAPEX...');
    await migrateOpexCapexFields(this.db);
  } else {
    console.log('ℹ️  Migration OPEX/CAPEX déjà appliquée');
  }
} catch (error: any) {
  console.warn('Erreur lors de la migration OPEX/CAPEX:', error?.message || error);
}
```

**Ligne approximative:** Ajouter avant la fin de `migrateTables()`, vers la ligne ~1420-1430

---

## 📋 Phase 5 : Services & Logique (À FAIRE)

### Créer CoutProductionService
**Fichier:** `src/services/CoutProductionService.ts`

**Méthodes clés:**
```typescript
class CoutProductionService {
  // Calcule les coûts d'une période
  async calculateCoutsPeriode(
    projetId: string,
    dateDebut: Date,
    dateFin: Date,
    parametres: Projet
  ): Promise<CoutProductionPeriode>
  
  // Met à jour les marges d'une vente
  async updateMargesVente(
    vente: Revenu,
    poids_kg: number,
    coutsPeriode: CoutProductionPeriode
  ): Promise<Revenu>
  
  // Recalcule toutes les marges d'une période
  async recalculerMargesPeriode(
    projetId: string,
    dateDebut: Date,
    dateFin: Date
  ): Promise<void>
}
```

### Modifier Redux Slices
**Fichier:** `src/store/slices/financeSlice.ts`

**Nouveau thunk:**
```typescript
export const calculateAndSaveMargesVente = createAsyncThunk(
  'finance/calculateAndSaveMargesVente',
  async ({ venteId, poidsKg }: { venteId: string; poidsKg: number }, { getState }) => {
    const state = getState() as RootState;
    const vente = state.finance.entities.revenus[venteId];
    const projet = state.projet.projetActif;
    
    if (!vente || !projet) throw new Error('Vente ou projet non trouvé');
    
    // Calculer les coûts de la période
    const dateVente = parseISO(vente.date);
    const debutMois = startOfMonth(dateVente);
    const finMois = endOfMonth(dateVente);
    
    // Charger dépenses et revenus
    // Calculer coûts
    // Mettre à jour vente
    
    return venteUpdated;
  }
);
```

---

## 🎨 Phase 6 : Interface Utilisateur (À FAIRE)

### 1. Paramètres Projet
**Fichier:** `src/components/ParametresProjetComponent.tsx`

**Ajouter après les champs de prix:**
```tsx
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: colors.text }]}>
    💰 Gestion OPEX / CAPEX
  </Text>
  
  <FormField
    label="Durée d'amortissement (mois)"
    value={editData.duree_amortissement_par_defaut_mois?.toString() || '36'}
    onChangeText={(text) =>
      setEditData({ 
        ...editData, 
        duree_amortissement_par_defaut_mois: parseInt(text) || 36 
      })
    }
    keyboardType="numeric"
    helper="Durée sur laquelle les investissements (CAPEX) sont amortis. Défaut: 36 mois (3 ans)"
  />
  
  <Text style={[styles.helperText, { color: colors.textSecondary }]}>
    Les investissements (équipements lourds, aménagements, etc.) seront 
    automatiquement amortis sur cette durée dans le calcul des coûts de production.
  </Text>
</View>
```

### 2. Formulaire de Dépense
**Fichier:** `src/components/DepenseFormModal.tsx`

**Afficher le type OPEX/CAPEX après sélection de catégorie:**
```tsx
{formData.categorie && (
  <View style={[styles.typeIndicator, {
    backgroundColor: getTypeDepense(formData.categorie) === 'CAPEX' 
      ? colors.warning + '20' 
      : colors.info + '20'
  }]}>
    <Text style={[styles.typeLabel, {
      color: getTypeDepense(formData.categorie) === 'CAPEX' 
        ? colors.warning 
        : colors.info
    }]}>
      {getTypeDepense(formData.categorie) === 'CAPEX' 
        ? '💰 CAPEX - Investissement (amorti sur ' + (projet?.duree_amortissement_par_defaut_mois || 36) + ' mois)'
        : '📊 OPEX - Dépense opérationnelle'
      }
    </Text>
  </View>
)}
```

### 3. Formulaire de Revenu (Vente)
**Fichier:** `src/components/RevenuFormModal.tsx`

**Ajouter champ poids pour ventes de porcs:**
```tsx
{formData.categorie === 'vente_porc' && (
  <>
    <FormField
      label="Poids du porc (kg)"
      value={poidsKg}
      onChangeText={setPoidsKg}
      keyboardType="numeric"
      placeholder="120"
      helper="Nécessaire pour calculer automatiquement la marge"
    />
    
    {poidsKg && (
      <View style={styles.previewBox}>
        <Text style={styles.previewLabel}>
          Calcul automatique de la marge au moment de la vente
        </Text>
      </View>
    )}
  </>
)}
```

### 4. Dashboard - Nouveaux Indicateurs
**Fichier:** `src/components/DashboardMainWidgets.tsx`

**Ajouter cartes de coûts:**
```tsx
<View style={styles.row}>
  {/* Coût OPEX par kg */}
  <StatCard
    icon="💰"
    title="Coût/kg (OPEX)"
    value={`${coutKgOpex.toLocaleString()} FCFA`}
    subtitle="Dépenses opérationnelles"
    color={colors.info}
    style={{ flex: 1 }}
  />
  
  {/* Coût Complet par kg */}
  <StatCard
    icon="📊"
    title="Coût/kg (Complet)"
    value={`${coutKgComplet.toLocaleString()} FCFA`}
    subtitle="OPEX + Amortissement"
    color={colors.primary}
    style={{ flex: 1 }}
  />
</View>

<View style={styles.row}>
  {/* Marge Moyenne */}
  <StatCard
    icon="📈"
    title="Marge Moyenne"
    value={`${margeMoyenne.toFixed(1)} %`}
    subtitle={getMargeLabel(margeMoyenne)}
    color={getMargeColor(getStatutMarge(margeMoyenne))}
    style={{ flex: 1 }}
  />
  
  {/* Bénéfice Total */}
  <StatCard
    icon="💵"
    title="Bénéfice Total"
    value={`${beneficeTotal.toLocaleString()} FCFA`}
    subtitle="Ce mois"
    color={beneficeTotal >= 0 ? colors.success : colors.error}
    style={{ flex: 1 }}
  />
</View>
```

### 5. Fiche Détail Vente
**Fichier:** `src/components/VenteDetailModal.tsx` (À CRÉER)

**Structure complète:**
```tsx
<CustomModal visible={visible} onClose={onClose} title="Détail de la Vente">
  <ScrollView>
    {/* Informations de base */}
    <Section title="💰 Informations de Vente">
      <InfoRow label="Date" value={formatDate(vente.date)} />
      <InfoRow label="Poids" value={`${vente.poids_kg} kg`} />
      <InfoRow label="Prix de vente" value={`${vente.montant.toLocaleString()} FCFA`} />
    </Section>
    
    {/* Coûts de production */}
    <Section title="📊 Coûts de Production">
      <InfoRow 
        label="Coût OPEX/kg" 
        value={`${vente.cout_kg_opex?.toLocaleString()} FCFA`} 
      />
      <InfoRow 
        label="Coût Complet/kg" 
        value={`${vente.cout_kg_complet?.toLocaleString()} FCFA`} 
      />
      <Separator />
      <InfoRow 
        label="Coût réel OPEX" 
        value={`${vente.cout_reel_opex?.toLocaleString()} FCFA`} 
        bold 
      />
      <InfoRow 
        label="Coût réel Complet" 
        value={`${vente.cout_reel_complet?.toLocaleString()} FCFA`} 
        bold 
      />
    </Section>
    
    {/* Marges */}
    <Section title="📈 Marges">
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
    </Section>
  </ScrollView>
</CustomModal>
```

### 6. Graphiques Finance
**Fichier:** `src/components/FinanceGraphiquesComponent.tsx`

**Ajouter graphique OPEX vs CAPEX:**
```tsx
<ChartCard title="📊 OPEX vs CAPEX Amorti">
  <BarChart
    data={{
      labels: derniersMois,
      datasets: [
        {
          data: opexParMois,
          color: () => colors.info,
          label: 'OPEX',
        },
        {
          data: capexAmortiParMois,
          color: () => colors.warning,
          label: 'CAPEX Amorti',
        },
      ],
    }}
    width={Dimensions.get('window').width - 60}
    height={220}
    chartConfig={chartConfig}
    style={styles.chart}
  />
</ChartCard>
```

---

## 🧪 Tests à Effectuer

### Tests Unitaires
```bash
# Tester les fonctions de calcul
npm test src/utils/financeCalculations.test.ts
npm test src/utils/margeCalculations.test.ts
```

### Tests d'Intégration
1. ✅ Créer une dépense CAPEX → Vérifier type automatique
2. ✅ Créer une dépense OPEX → Vérifier type automatique
3. ✅ Créer une vente avec poids → Vérifier calcul marges
4. ✅ Modifier durée amortissement → Recalculer coûts
5. ✅ Dashboard → Afficher coûts/kg et marges

### Tests Manuels
- [ ] Migrer une base existante → Vérifier colonnes ajoutées
- [ ] Créer nouveau projet → Vérifier durée amortissement défaut
- [ ] Saisir ventes → Vérifier marges calculées
- [ ] Modifier paramètres → Vérifier recalcul

---

## 📊 Exemple de Calcul (Monnaie: FCFA)

### Données du Mois
```
OPEX : 2 000 000 FCFA
CAPEX investis :
  - Tracteur (4 000 000 FCFA, acheté il y a 6 mois)
  - Bâtiment (10 000 000 FCFA, acheté il y a 12 mois)
Durée amortissement : 36 mois
Kg vendus : 2 000 kg
```

### Calculs
```
Amortissement tracteur = 4 000 000 / 36 = 111 111 FCFA/mois
Amortissement bâtiment = 10 000 000 / 36 = 277 778 FCFA/mois
Total amortissement = 388 889 FCFA/mois

Coût/kg OPEX = 2 000 000 / 2 000 = 1 000 FCFA/kg
Coût/kg Complet = (2 000 000 + 388 889) / 2 000 = 1 194 FCFA/kg
```

### Vente d'un Porc (120 kg, 180 000 FCFA)
```
Coût réel OPEX = 120 * 1 000 = 120 000 FCFA
Coût réel Complet = 120 * 1 194 = 143 280 FCFA

Marge OPEX = 180 000 - 120 000 = 60 000 FCFA (33,3%)
Marge Complète = 180 000 - 143 280 = 36 720 FCFA (20,4%)
→ Statut : confortable ✅ (vert)
```

---

## ✅ Checklist Finale

### Backend
- [x] Types étendus (finance.ts, projet.ts)
- [x] Utilitaires de calcul créés
- [x] Migration database créée
- [ ] Migration intégrée dans database.ts
- [ ] Service CoutProductionService créé
- [ ] Redux slices mis à jour
- [ ] Tests unitaires

### Frontend
- [ ] Paramètres - Champ durée amortissement
- [ ] Dépenses - Affichage type OPEX/CAPEX
- [ ] Revenus - Champ poids pour ventes
- [ ] Dashboard - Indicateurs coûts/kg
- [ ] VenteDetailModal créé
- [ ] Graphiques OPEX/CAPEX
- [ ] Tests manuels

---

**Status Actuel:** ✅ 40% complété (Phases 1-3)  
**Prochaine étape:** Intégrer la migration + créer CoutProductionService  
**Temps estimé restant:** 3-4 heures

Le système OPEX/CAPEX transformera la visibilité financière de l'application ! 💰📊✨

