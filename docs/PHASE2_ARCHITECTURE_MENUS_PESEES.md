# PHASE 2 : ARCHITECTURE DE LA SOLUTION HARMONISÉE

**Date** : 2025-01-10  
**Objectif** : Concevoir une architecture adaptative unifiée pour harmoniser les menus de suivi des pesées

---

## CONTEXTE ET PRÉCISIONS CRITIQUES

### Différences fondamentales entre les modes

- **Mode Bande** : Animaux groupés par **LOGES** (batch)
  - Données agrégées par loge
  - Poids moyen par loge
  - Pesées collectives
  
- **Mode Individuel** : Animaux **INDIVIDUELS**, pas de regroupement
  - Données par animal
  - Poids réel par animal
  - Pesées individuelles

### Principe d'harmonisation

- **Même interface** avec **comportement adaptatif** selon le mode
- **Mêmes fonctionnalités** (dashboard, graphiques, listes, détails)
- **Mêmes métriques** (GMQ, poids moyen, etc.)
- **Composants communs** quand possible, **spécifiques** quand nécessaire

---

## 2.1 - ÉCRAN PRINCIPAL UNIFIÉ : WeighingScreen.tsx

### Structure adaptative

```typescript
// src/screens/WeighingScreen.tsx

interface WeighingScreenProps {
  // Props héritées de la navigation
}

export default function WeighingScreen() {
  const mode = useModeElevage(); // 'individuel' | 'bande'
  const isBatchMode = mode === 'bande';
  
  return (
    <SafeAreaView>
      <StandardHeader 
        icon="scale" 
        title={isBatchMode ? 'Suivi des pesées' : 'Suivi des pesées'}
        subtitle={/* Adaptatif selon le mode */}
      />
      
      <ScrollView>
        {/* SECTION 1 : DASHBOARD STATISTIQUES GLOBALES */}
        <PeseeDashboard 
          mode={mode}
          projetId={projetActif.id}
        />
        
        {/* SECTION 2 : GRAPHE ÉVOLUTION GLOBALE */}
        <PoidsEvolutionChart
          mode={mode}
          projetId={projetActif.id}
          periode={periode}
        />
        
        {/* SECTION 3 : LISTE DES SUJETS */}
        {isBatchMode ? (
          <BatchesListSection 
            batches={batches}
            activeBatchId={activeBatchId}
            onBatchSelect={handleBatchSelect}
          />
        ) : (
          <AnimalsListSection 
            animals={animals}
            selectedAnimalId={selectedAnimalId}
            onAnimalSelect={handleAnimalSelect}
          />
        )}
        
        {/* SECTION 4 : GRAPHE TOUS SUJETS (Onglet optionnel) */}
        <AllSubjectsChart
          mode={mode}
          projetId={projetActif.id}
          periode={periode}
        />
      </ScrollView>
      
      {/* MODAL NOUVELLE PESÉE */}
      <ProductionPeseeFormModal ... />
    </SafeAreaView>
  );
}
```

### Logique adaptative

1. **Détection du mode** : `useModeElevage()` hook existant
2. **Chargement des données** :
   - Mode bande → Charger `batches` et `batchWeighings`
   - Mode individuel → Charger `animals` et `individualWeighings`
3. **Affichage conditionnel** :
   - Même dashboard mais avec données différentes
   - Même graphique mais avec source de données différente
   - Listes différentes (loges vs animaux) mais même structure

---

## 2.2 - COMPOSANTS COMMUNS

### A) PeseeDashboard.tsx

**Rôle** : Afficher les statistiques globales (poids moyen, GMQ moyen, etc.)

```typescript
// src/components/pesees/PeseeDashboard.tsx

interface PeseeDashboardProps {
  mode: 'individuel' | 'bande';
  projetId: string;
  periode?: '7j' | '30j' | '90j' | 'tout';
}

export default function PeseeDashboard({ 
  mode, 
  projetId, 
  periode = '30j' 
}: PeseeDashboardProps) {
  const { data: stats, loading } = usePeseesStats(projetId, mode, periode);
  
  if (loading) return <SkeletonLoader />;
  if (!stats) return null;
  
  return (
    <Card elevation="medium" padding="large">
      <View style={styles.header}>
        <Ionicons name="analytics" size={24} color={colors.primary} />
        <Text style={styles.title}>
          📊 {mode === 'bande' ? 'Progression Globale de la Ferme' : 'Vue d\'ensemble du Cheptel'}
        </Text>
      </View>
      
      <View style={styles.statsGrid}>
        {/* Poids moyen */}
        <StatBox
          label={mode === 'bande' ? 'Poids moyen' : 'Poids moyen'}
          value={`${stats.poids_moyen.toFixed(1)} kg`}
          icon="scale"
          color={colors.primary}
        />
        
        {/* GMQ moyen */}
        <StatBox
          label="GMQ moyen"
          value={`${stats.gmq_moyen.toFixed(0)} g/j`}
          icon="trending-up"
          color={colors.success}
        />
        
        {/* Dernière pesée */}
        <StatBox
          label="Dernière pesée"
          value={formatDistanceToNow(new Date(stats.derniere_pesee_date), { 
            addSuffix: true, 
            locale: fr 
          })}
          icon="time"
          color={colors.info}
        />
        
        {/* Nombre d'animaux */}
        <StatBox
          label={mode === 'bande' ? 'Loges' : 'Animaux'}
          value={stats.total_animaux.toString()}
          icon={mode === 'bande' ? 'home' : 'paw'}
          color={colors.warning}
        />
        
        {/* En retard */}
        <StatBox
          label="En retard"
          value={stats.nb_en_retard.toString()}
          icon="alert-circle"
          color={colors.error}
          showBadge={stats.nb_en_retard > 0}
        />
        
        {/* Objectifs atteints */}
        <StatBox
          label="Objectifs"
          value={`${stats.objectifs_atteints} / ${stats.total_animaux}`}
          icon="checkmark-circle"
          color={colors.success}
        />
      </View>
      
      {/* Sélecteur de période */}
      <View style={styles.periodSelector}>
        {['7j', '30j', '90j', 'tout'].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, periode === p && styles.periodButtonActive]}
            onPress={() => setPeriode(p)}
          >
            <Text>{p === 'tout' ? 'Tout' : p}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
}
```

**Hooks utilisés** :
- `usePeseesStats(projetId, mode, periode)` → Retourne statistiques agrégées

**Backend** :
- `POST /api/pesees/stats` → Calcule les stats selon le mode

---

### B) PoidsEvolutionChart.tsx

**Rôle** : Afficher l'évolution du poids moyen (cheptel ou ferme)

```typescript
// src/components/pesees/PoidsEvolutionChart.tsx

interface PoidsEvolutionChartProps {
  mode: 'individuel' | 'bande';
  projetId: string;
  periode: '7j' | '30j' | '90j' | 'tout';
  title?: string;
}

export default function PoidsEvolutionChart({ 
  mode, 
  projetId, 
  periode,
  title 
}: PoidsEvolutionChartProps) {
  const { data: evolution, loading } = usePoidsEvolution(projetId, mode, periode);
  
  if (loading) return <SkeletonLoader />;
  if (!evolution || evolution.dates.length === 0) {
    return <EmptyState message="Aucune pesée disponible" />;
  }
  
  return (
    <Card elevation="small" padding="medium">
      <View style={styles.header}>
        <Ionicons name="trending-up" size={24} color={colors.primary} />
        <Text style={styles.title}>
          {title || `Évolution du ${mode === 'bande' ? 'poids total' : 'poids moyen'} (${periode})`}
        </Text>
      </View>
      
      {/* Statistiques rapides */}
      <View style={styles.statsRow}>
        <StatMini label="Initial" value={`${evolution.poids_initial.toFixed(1)} kg`} />
        <StatMini label="Actuel" value={`${evolution.poids_actuel.toFixed(1)} kg`} />
        <StatMini label="Gain" value={`+${evolution.gain_total.toFixed(1)} kg`} />
        <StatMini label="GMQ" value={`${evolution.gmq.toFixed(0)} g/j`} />
      </View>
      
      {/* Graphique */}
      <ScrollView horizontal>
        <LineChart
          data={{
            labels: evolution.dates,
            datasets: [
              {
                data: evolution.poids_moyens,
                color: (opacity = 1) => colors.primary,
                strokeWidth: 3,
              },
            ],
          }}
          width={Math.max(SCREEN_WIDTH - 48, evolution.dates.length * 60)}
          height={220}
          // ... configuration chart
        />
      </ScrollView>
      
      {/* Légende */}
      <View style={styles.legend}>
        <View style={styles.legendDot} />
        <Text style={styles.legendText}>
          {mode === 'bande' ? 'Poids total (kg)' : 'Poids moyen (kg)'}
        </Text>
      </View>
    </Card>
  );
}
```

**Hooks utilisés** :
- `usePoidsEvolution(projetId, mode, periode)` → Retourne données d'évolution

**Backend** :
- `POST /api/pesees/evolution` → Retourne évolution selon le mode

---

### C) SujetPeseeCard.tsx (Adapté d'AnimalCard)

**Rôle** : Carte d'un sujet (animal ou loge) avec métriques de pesée

```typescript
// src/components/pesees/SujetPeseeCard.tsx

interface SujetPeseeCardProps {
  // Mode individuel
  animal?: ProductionAnimal;
  dernierePesee?: ProductionPesee;
  
  // Mode bande
  batch?: Batch;
  dernierePeseeBatch?: BatchWeighingSummary;
  
  // Commun
  mode: 'individuel' | 'bande';
  gmq?: number;
  enRetard?: boolean;
  joursDepuisDernierePesee?: number;
  
  // Actions
  onViewDetails: () => void;
  onNouvellePesee: () => void;
}

export default function SujetPeseeCard({
  animal,
  batch,
  mode,
  dernierePesee,
  dernierePeseeBatch,
  gmq,
  enRetard,
  joursDepuisDernierePesee,
  onViewDetails,
  onNouvellePesee,
}: SujetPeseeCardProps) {
  const { colors } = useTheme();
  
  // Données adaptatives
  const sujetData = mode === 'bande' 
    ? {
        id: batch!.id,
        nom: batch!.pen_name,
        poidsActuel: dernierePeseeBatch?.average_weight_kg || batch!.average_weight_kg || 0,
        nombreSujets: batch!.total_count,
        icon: 'home' as const,
      }
    : {
        id: animal!.id,
        nom: animal!.code || animal!.id,
        poidsActuel: dernierePesee?.poids_kg || 0,
        nombreSujets: 1,
        icon: 'paw' as const,
      };
  
  return (
    <Card elevation="small" padding="medium" style={styles.card}>
      <View style={styles.header}>
        {/* Icône */}
        <View style={[styles.iconBadge, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name={sujetData.icon} size={24} color={colors.primary} />
        </View>
        
        {/* Informations */}
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>
              {sujetData.nom}
            </Text>
            {enRetard && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={styles.badgeText}>🔴 En retard</Text>
              </View>
            )}
          </View>
          
          {mode === 'individuel' && animal && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {animal.race} • {animal.sexe}
            </Text>
          )}
          
          {mode === 'bande' && batch && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {batch.category.replace('_', ' ')} • {sujetData.nombreSujets} sujet(s)
            </Text>
          )}
        </View>
      </View>
      
      {/* Métriques */}
      <View style={styles.metrics}>
        <MetricBox
          label="Poids actuel"
          value={`${sujetData.poidsActuel.toFixed(1)} kg`}
          color={colors.primary}
          size="large"
        />
        
        {gmq !== undefined && gmq !== null && (
          <MetricBox
            label="GMQ"
            value={`${gmq.toFixed(0)} g/j`}
            icon={gmq >= 500 ? 'trending-up' : 'trending-down'}
            color={gmq >= 500 ? colors.success : colors.warning}
          />
        )}
        
        {joursDepuisDernierePesee !== undefined && (
          <MetricBox
            label="Dernière pesée"
            value={joursDepuisDernierePesee === 0 
              ? "Aujourd'hui" 
              : `Il y a ${joursDepuisDernierePesee}j`}
            color={enRetard ? colors.error : colors.textSecondary}
          />
        )}
      </View>
      
      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Voir détails"
          variant="outline"
          size="small"
          onPress={onViewDetails}
          icon={<Ionicons name="eye" size={16} />}
        />
        <Button
          title="Nouvelle pesée"
          variant="primary"
          size="small"
          onPress={onNouvellePesee}
          icon={<Ionicons name="add-circle" size={16} />}
        />
      </View>
    </Card>
  );
}
```

**Style** : Réutilise le design d'`AnimalCard` avec adaptations pour contexte pesées

---

## 2.3 - COMPOSANTS SPÉCIFIQUES PAR MODE

### A) AnimalsListSection.tsx (Mode Individuel)

**Rôle** : Liste des animaux avec cartes pour mode individuel

```typescript
// src/components/pesees/AnimalsListSection.tsx

interface AnimalsListSectionProps {
  animals: ProductionAnimal[];
  peseesParAnimal: Record<string, ProductionPesee[]>;
  gmqParAnimal: Record<string, number>;
  onAnimalSelect: (animalId: string) => void;
  onNouvellePesee: (animalId: string) => void;
}

export default function AnimalsListSection({
  animals,
  peseesParAnimal,
  gmqParAnimal,
  onAnimalSelect,
  onNouvellePesee,
}: AnimalsListSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'poids' | 'gmq' | 'date' | 'code'>('date');
  const [filterEnRetard, setFilterEnRetard] = useState(false);
  
  // Filtrer et trier
  const filteredAndSorted = useMemo(() => {
    let filtered = animals.filter(animal => {
      const matchesSearch = animal.code?.toLowerCase().includes(searchQuery.toLowerCase());
      const pesees = peseesParAnimal[animal.id] || [];
      const dernierePesee = pesees[pesees.length - 1];
      const enRetard = isPeseeEnRetard(dernierePesee);
      
      if (filterEnRetard && !enRetard) return false;
      return matchesSearch;
    });
    
    // Trier
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'poids':
          const poidsA = peseesParAnimal[a.id]?.[peseesParAnimal[a.id].length - 1]?.poids_kg || 0;
          const poidsB = peseesParAnimal[b.id]?.[peseesParAnimal[b.id].length - 1]?.poids_kg || 0;
          return poidsB - poidsA;
        case 'gmq':
          return (gmqParAnimal[b.id] || 0) - (gmqParAnimal[a.id] || 0);
        case 'date':
          const dateA = peseesParAnimal[a.id]?.[peseesParAnimal[a.id].length - 1]?.date;
          const dateB = peseesParAnimal[b.id]?.[peseesParAnimal[b.id].length - 1]?.date;
          return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
        case 'code':
          return (a.code || '').localeCompare(b.code || '');
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [animals, searchQuery, sortBy, filterEnRetard, peseesParAnimal, gmqParAnimal]);
  
  return (
    <View style={styles.container}>
      {/* En-tête avec filtres */}
      <View style={styles.header}>
        <Text style={styles.title}>
          🐷 Liste des sujets ({filteredAndSorted.length})
        </Text>
        
        {/* Recherche */}
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par code..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
        {/* Filtres */}
        <View style={styles.filters}>
          <TouchableOpacity
            style={[styles.filterButton, filterEnRetard && styles.filterButtonActive]}
            onPress={() => setFilterEnRetard(!filterEnRetard)}
          >
            <Text>En retard</Text>
          </TouchableOpacity>
          
          {/* Tri */}
          <Picker
            selectedValue={sortBy}
            onValueChange={setSortBy}
          >
            <Picker.Item label="Trier par date" value="date" />
            <Picker.Item label="Trier par poids" value="poids" />
            <Picker.Item label="Trier par GMQ" value="gmq" />
            <Picker.Item label="Trier par code" value="code" />
          </Picker>
        </View>
      </View>
      
      {/* Liste des cartes */}
      {filteredAndSorted.map(animal => {
        const pesees = peseesParAnimal[animal.id] || [];
        const dernierePesee = pesees[pesees.length - 1];
        const gmq = gmqParAnimal[animal.id];
        const enRetard = isPeseeEnRetard(dernierePesee);
        const joursDepuis = dernierePesee 
          ? differenceInDays(new Date(), new Date(dernierePesee.date))
          : undefined;
        
        return (
          <SujetPeseeCard
            key={animal.id}
            mode="individuel"
            animal={animal}
            dernierePesee={dernierePesee}
            gmq={gmq}
            enRetard={enRetard}
            joursDepuisDernierePesee={joursDepuis}
            onViewDetails={() => onAnimalSelect(animal.id)}
            onNouvellePesee={() => onNouvellePesee(animal.id)}
          />
        );
      })}
    </View>
  );
}
```

---

### B) BatchesListSection.tsx (Mode Bande)

**Rôle** : Liste des loges avec cartes pour mode bande (existe déjà, à améliorer)

**Améliorations à apporter** :
1. ✅ Ajouter recherche par nom de loge
2. ✅ Ajouter tri/filtrage
3. ✅ Afficher GMQ dans les cartes
4. ✅ Badge "En retard" si applicable
5. ✅ Utiliser `SujetPeseeCard` pour cohérence visuelle

```typescript
// src/components/pesees/BatchesListSection.tsx
// (Adaptation de la section existante dans WeighingScreen.tsx)

// Même structure que AnimalsListSection mais avec batches
```

---

### C) SujetPeseeDetailScreen.tsx

**Rôle** : Écran de détail complet d'un sujet (animal ou loge)

```typescript
// src/screens/pesees/SujetPeseeDetailScreen.tsx

interface SujetPeseeDetailScreenProps {
  route: {
    params: {
      mode: 'individuel' | 'bande';
      sujetId: string; // animal_id ou batch_id
    };
  };
}

export default function SujetPeseeDetailScreen({ route }: SujetPeseeDetailScreenProps) {
  const { mode, sujetId } = route.params;
  const { data: details, loading } = useAnimalPeseeDetail(sujetId, mode);
  
  if (loading) return <LoadingScreen />;
  if (!details) return <ErrorScreen />;
  
  return (
    <SafeAreaView>
      <StandardHeader 
        icon={mode === 'bande' ? 'home' : 'paw'}
        title={mode === 'bande' ? details.batch?.pen_name : details.animal?.code}
        subtitle="Détails des pesées"
      />
      
      <ScrollView>
        {/* ONGLETS */}
        <TabView>
          <Tab label="Métriques">
            <MetricsTab details={details} mode={mode} />
          </Tab>
          
          <Tab label="Graphe">
            <GraphTab details={details} mode={mode} />
          </Tab>
          
          <Tab label="Historique">
            <HistoryTab details={details} mode={mode} />
          </Tab>
        </TabView>
        
        {/* ACTIONS */}
        <View style={styles.actions}>
          <Button title="Nouvelle pesée" onPress={handleNouvellePesee} />
          <Button title="Exporter données" variant="outline" onPress={handleExport} />
          {mode === 'individuel' && (
            <Button title="Modifier objectif" variant="outline" onPress={handleEditObjectif} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Composants des onglets

function MetricsTab({ details, mode }: { details: any; mode: 'individuel' | 'bande' }) {
  return (
    <Card>
      <View style={styles.metricsGrid}>
        <MetricCard label="Poids actuel" value={`${details.poids_actuel} kg`} />
        <MetricCard label="Poids initial" value={`${details.poids_initial} kg`} />
        <MetricCard label="Gain total" value={`+${details.gain_total} kg`} />
        <MetricCard label="GMQ moyen" value={`${details.gmq_moyen} g/j`} />
        {mode === 'individuel' && (
          <>
            <MetricCard label="Âge actuel" value={details.age_jours + ' jours'} />
            <MetricCard label="Objectif" value={details.objectif_poids ? `${details.objectif_poids} kg` : 'Non défini'} />
            <MetricCard label="Progression" value={`${(details.progression_objectif * 100).toFixed(0)}%`} />
          </>
        )}
      </View>
      
      {/* Comparaison avec moyenne */}
      <ComparisonCard 
        sujetGMQ={details.gmq_moyen}
        moyenneGMQ={details.moyenne_cheptel_gmq}
      />
    </Card>
  );
}

function GraphTab({ details, mode }: { details: any; mode: 'individuel' | 'bande' }) {
  const [periode, setPeriode] = useState<'7j' | '30j' | '90j' | 'tout'>('90j');
  
  return (
    <Card>
      {/* Sélecteur de période */}
      <PeriodSelector periode={periode} onPeriodeChange={setPeriode} />
      
      {/* Graphique */}
      {mode === 'bande' ? (
        <BatchWeightEvolutionChart
          weighings={details.pesees}
          batchName={details.batch?.pen_name}
        />
      ) : (
        <WeightEvolutionChart
          pesees={details.pesees}
          animalName={details.animal?.code}
        />
      )}
      
      {/* Ligne de comparaison avec moyenne */}
      <ComparisonLine 
        moyenneCheptel={details.moyenne_cheptel_poids}
        periode={periode}
      />
    </Card>
  );
}

function HistoryTab({ details, mode }: { details: any; mode: 'individuel' | 'bande' }) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Historique complet des pesées</Text>
      
      <Table>
        <TableHeader>
          <TableHeaderCell>Date</TableHeaderCell>
          <TableHeaderCell>Poids</TableHeaderCell>
          {mode === 'individuel' && <TableHeaderCell>Gain</TableHeaderCell>}
          {mode === 'individuel' && <TableHeaderCell>GMQ</TableHeaderCell>}
          <TableHeaderCell>Notes</TableHeaderCell>
        </TableHeader>
        
        {details.pesees.map((pesee: any) => (
          <TableRow key={pesee.id}>
            <TableCell>{format(new Date(pesee.date), 'dd/MM/yyyy')}</TableCell>
            <TableCell>{pesee.poids_kg.toFixed(1)} kg</TableCell>
            {mode === 'individuel' && (
              <>
                <TableCell>{pesee.gain || '-'}</TableCell>
                <TableCell>{pesee.gmq || '-'} g/j</TableCell>
              </>
            )}
            <TableCell>{pesee.commentaire || '-'}</TableCell>
          </TableRow>
        ))}
      </Table>
      
      {/* Export */}
      <Button title="Exporter en CSV" variant="outline" onPress={handleExportCSV} />
    </Card>
  );
}
```

---

### D) AllSubjectsChart.tsx

**Rôle** : Graphique avec courbes superposées de tous les sujets

```typescript
// src/components/pesees/AllSubjectsChart.tsx

interface AllSubjectsChartProps {
  mode: 'individuel' | 'bande';
  projetId: string;
  periode: '7j' | '30j' | '90j' | 'tout';
}

export default function AllSubjectsChart({
  mode,
  projetId,
  periode,
}: AllSubjectsChartProps) {
  const { data: evolution, loading } = usePoidsEvolution(projetId, mode, periode);
  const [visibleSubjects, setVisibleSubjects] = useState<Set<string>>(new Set());
  
  if (loading) return <SkeletonLoader />;
  if (!evolution || !evolution.par_sujet) return <EmptyState />;
  
  // Générer couleurs pour chaque sujet
  const colors = generateColors(Object.keys(evolution.par_sujet).length);
  
  return (
    <Card elevation="medium" padding="large">
      <View style={styles.header}>
        <Ionicons name="bar-chart" size={24} color={colors.primary} />
        <Text style={styles.title}>
          📊 Évolution de tous les {mode === 'bande' ? 'loges' : 'sujets'}
        </Text>
        <Button 
          title="Exporter PNG" 
          size="small" 
          variant="outline"
          onPress={handleExportPNG}
        />
      </View>
      
      {/* Légende interactive */}
      <View style={styles.legend}>
        {Object.entries(evolution.par_sujet).map(([sujetId, data], index) => (
          <TouchableOpacity
            key={sujetId}
            style={styles.legendItem}
            onPress={() => {
              const newVisible = new Set(visibleSubjects);
              if (newVisible.has(sujetId)) {
                newVisible.delete(sujetId);
              } else {
                newVisible.add(sujetId);
              }
              setVisibleSubjects(newVisible);
            }}
          >
            <View style={[
              styles.legendDot, 
              { backgroundColor: colors[index] },
              !visibleSubjects.has(sujetId) && styles.legendDotHidden
            ]} />
            <Text style={[
              styles.legendText,
              !visibleSubjects.has(sujetId) && styles.legendTextHidden
            ]}>
              {data.nom}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Graphique multi-courbes */}
      <ScrollView horizontal>
        <LineChart
          data={{
            labels: evolution.dates,
            datasets: Object.entries(evolution.par_sujet)
              .filter(([sujetId]) => visibleSubjects.has(sujetId) || visibleSubjects.size === 0)
              .map(([sujetId, data], index) => ({
                data: data.poids,
                color: (opacity = 1) => colors[index],
                strokeWidth: 2,
              })),
          }}
          // ... configuration
        />
      </ScrollView>
      
      {/* Ligne moyenne */}
      <View style={styles.averageLine}>
        <View style={styles.averageLineDot} />
        <Text style={styles.averageLineText}>
          Ligne pointillée : Moyenne du cheptel
        </Text>
      </View>
    </Card>
  );
}
```

---

## 2.4 - HOOKS PERSONNALISÉS

### A) usePeseesStats.ts

```typescript
// src/hooks/usePeseesStats.ts

interface PeseesStats {
  poids_moyen: number;
  gmq_moyen: number;
  derniere_pesee_date: string;
  nb_en_retard: number;
  objectifs_atteints: number;
  total_animaux: number;
}

export function usePeseesStats(
  projetId: string,
  mode: 'individuel' | 'bande',
  periode: '7j' | '30j' | '90j' | 'tout' = '30j'
) {
  return useQuery({
    queryKey: ['pesees-stats', projetId, mode, periode],
    queryFn: async () => {
      const response = await apiClient.post<PeseesStats>('/api/pesees/stats', {
        projet_id: projetId,
        mode,
        periode,
      });
      return response;
    },
  });
}
```

**Backend** : `POST /api/pesees/stats`

---

### B) usePoidsEvolution.ts

```typescript
// src/hooks/usePoidsEvolution.ts

interface PoidsEvolution {
  dates: string[];
  poids_moyens: number[];
  poids_initial: number;
  poids_actuel: number;
  gain_total: number;
  gmq: number;
  par_sujet?: Record<string, {
    nom: string;
    poids: number[];
  }>;
}

export function usePoidsEvolution(
  projetId: string,
  mode: 'individuel' | 'bande',
  periode: '7j' | '30j' | '90j' | 'tout' = '30j',
  sujetIds?: string[] // Optionnel : pour filtrer certains sujets
) {
  return useQuery({
    queryKey: ['poids-evolution', projetId, mode, periode, sujetIds],
    queryFn: async () => {
      const response = await apiClient.post<PoidsEvolution>('/api/pesees/evolution', {
        projet_id: projetId,
        mode,
        periode,
        sujet_ids: sujetIds, // Si null/undefined, retourne tous les sujets
      });
      return response;
    },
  });
}
```

**Backend** : `POST /api/pesees/evolution`

---

### C) useAnimalPeseeDetail.ts

```typescript
// src/hooks/useAnimalPeseeDetail.ts

interface AnimalPeseeDetail {
  // Mode individuel
  animal?: ProductionAnimal;
  
  // Mode bande
  batch?: Batch;
  
  // Commun
  pesees: (ProductionPesee | BatchWeighingSummary)[];
  poids_actuel: number;
  poids_initial: number;
  gain_total: number;
  gmq_moyen: number;
  age_jours?: number; // Mode individuel uniquement
  objectif_poids?: number;
  objectif_date?: string;
  progression_objectif?: number;
  moyenne_cheptel_poids?: number;
  moyenne_cheptel_gmq?: number;
  en_retard: boolean;
}

export function useAnimalPeseeDetail(
  sujetId: string,
  mode: 'individuel' | 'bande'
) {
  return useQuery({
    queryKey: ['animal-pesee-detail', sujetId, mode],
    queryFn: async () => {
      const endpoint = mode === 'bande' 
        ? `/api/batch-weighings/batch/${sujetId}/details`
        : `/api/animaux/${sujetId}/pesees`;
      
      const response = await apiClient.get<AnimalPeseeDetail>(endpoint);
      return response;
    },
  });
}
```

**Backend** : 
- Mode individuel : `GET /api/animaux/:animalId/pesees`
- Mode bande : `GET /api/batch-weighings/batch/:batchId/details` (existe déjà)

---

## 2.5 - UTILITAIRES

### A) GMQCalculator.ts

```typescript
// src/utils/gmqCalculator.ts

import { differenceInDays, parseISO } from 'date-fns';

/**
 * Calcule le GMQ entre deux pesées
 * @param poidsInitial Poids initial en kg
 * @param poidsActuel Poids actuel en kg
 * @param dateInitiale Date de la pesée initiale
 * @param dateActuelle Date de la pesée actuelle
 * @returns GMQ en grammes/jour (arrondi)
 */
export function calculateGMQ(
  poidsInitial: number,
  poidsActuel: number,
  dateInitiale: Date | string,
  dateActuelle: Date | string
): number {
  const dateInit = typeof dateInitiale === 'string' ? parseISO(dateInitiale) : dateInitiale;
  const dateAct = typeof dateActuelle === 'string' ? parseISO(dateActuelle) : dateActuelle;
  
  const joursEcoules = differenceInDays(dateAct, dateInit);
  
  if (joursEcoules <= 0) return 0;
  
  const gainTotal = (poidsActuel - poidsInitial) * 1000; // Convertir en grammes
  const gmq = gainTotal / joursEcoules;
  
  return Math.round(gmq);
}

/**
 * Calcule le GMQ moyen sur une période avec plusieurs pesées
 * @param pesees Array de pesées triées par date (croissante)
 * @returns GMQ moyen en grammes/jour
 */
export function calculateAverageGMQ(pesees: Array<{ poids_kg: number; date: string | Date }>): number {
  if (pesees.length < 2) return 0;
  
  const premiere = pesees[0];
  const derniere = pesees[pesees.length - 1];
  
  return calculateGMQ(
    premiere.poids_kg,
    derniere.poids_kg,
    premiere.date,
    derniere.date
  );
}

/**
 * Calcule le GMQ par intervalle entre pesées consécutives
 * @param pesees Array de pesées triées par date
 * @returns Array de { date, gmq } pour chaque intervalle
 */
export function calculateGMQByInterval(
  pesees: Array<{ poids_kg: number; date: string | Date }>
): Array<{ date: string; gmq: number }> {
  const results: Array<{ date: string; gmq: number }> = [];
  
  for (let i = 1; i < pesees.length; i++) {
    const previous = pesees[i - 1];
    const current = pesees[i];
    
    const gmq = calculateGMQ(
      previous.poids_kg,
      current.poids_kg,
      previous.date,
      current.date
    );
    
    results.push({
      date: typeof current.date === 'string' ? current.date : current.date.toISOString(),
      gmq,
    });
  }
  
  return results;
}

/**
 * Détermine si une pesée est en retard
 * @param dernierePesee Dernière pesée effectuée
 * @param frequenceAttendue Fréquence attendue en jours (défaut: 7)
 * @returns true si la pesée est en retard
 */
export function isPeseeEnRetard(
  dernierePesee: { date: string | Date } | null | undefined,
  frequenceAttendue: number = 7
): boolean {
  if (!dernierePesee) return true; // Jamais pesé = en retard
  
  const datePesee = typeof dernierePesee.date === 'string' 
    ? parseISO(dernierePesee.date) 
    : dernierePesee.date;
  
  const joursDepuis = differenceInDays(new Date(), datePesee);
  return joursDepuis > frequenceAttendue;
}

/**
 * Calcule le nombre de jours depuis la dernière pesée
 */
export function joursDepuisDernierePesee(
  dernierePesee: { date: string | Date } | null | undefined
): number | undefined {
  if (!dernierePesee) return undefined;
  
  const datePesee = typeof dernierePesee.date === 'string' 
    ? parseISO(dernierePesee.date) 
    : dernierePesee.date;
  
  return differenceInDays(new Date(), datePesee);
}
```

---

## 2.6 - ENDPOINTS BACKEND

### A) POST /api/pesees/stats

**Rôle** : Calculer les statistiques globales pour un projet

**Body** :
```json
{
  "projet_id": "uuid",
  "mode": "individuel" | "bande",
  "periode": "7j" | "30j" | "90j" | "tout"
}
```

**Réponse** :
```json
{
  "poids_moyen": 85.5,
  "gmq_moyen": 450,
  "derniere_pesee_date": "2025-01-02T10:00:00Z",
  "nb_en_retard": 2,
  "objectifs_atteints": 8,
  "total_animaux": 12
}
```

**Logique** :
- Mode individuel : Agréger toutes les pesées individuelles
- Mode bande : Agréger toutes les pesées batch (moyennes pondérées)

---

### B) POST /api/pesees/evolution

**Rôle** : Retourner l'évolution du poids sur une période

**Body** :
```json
{
  "projet_id": "uuid",
  "mode": "individuel" | "bande",
  "periode": "7j" | "30j" | "90j" | "tout",
  "sujet_ids": ["uuid1", "uuid2"] // Optionnel : filtrer certains sujets
}
```

**Réponse** :
```json
{
  "dates": ["2024-12-01", "2024-12-08", "2024-12-15", ...],
  "poids_moyens": [78, 80, 82, ...],
  "poids_initial": 78,
  "poids_actuel": 85,
  "gain_total": 7,
  "gmq": 450,
  "par_sujet": {
    "uuid-animal-1": {
      "nom": "P001",
      "poids": [75, 77, 79, ...]
    },
    "uuid-animal-2": {
      "nom": "P002",
      "poids": [80, 82, 84, ...]
    },
    ...
  }
}
```

**Logique** :
- Mode individuel : Grouper par date, calculer moyenne pondérée des poids individuels
- Mode bande : Grouper par date, sommer les poids totaux de chaque loge
- `par_sujet` : Retourné uniquement si `sujet_ids` est fourni ou si mode = individuel

---

### C) GET /api/animaux/:animalId/pesees

**Rôle** : Retourner les détails complets des pesées d'un animal (Mode individuel)

**Réponse** :
```json
{
  "animal": {
    "id": "uuid",
    "code": "P001",
    "race": "Large White",
    "sexe": "Mâle",
    "date_naissance": "2024-06-15",
    ...
  },
  "pesees": [
    {
      "id": "uuid",
      "date": "2025-01-02",
      "poids_kg": 85,
      "commentaire": "RAS",
      "gmq": 450,
      "gain": 2
    },
    ...
  ],
  "metriques": {
    "poids_actuel": 85,
    "poids_initial": 25,
    "gain_total": 60,
    "gmq_moyen": 450,
    "age_jours": 193,
    "objectif_poids": 90,
    "objectif_date": "2025-01-15",
    "progression_objectif": 0.94,
    "en_retard": false,
    "moyenne_cheptel_poids": 83.5,
    "moyenne_cheptel_gmq": 440
  }
}
```

---

## 2.7 - STRUCTURE DES FICHIERS

```
src/
├── screens/
│   ├── WeighingScreen.tsx (✅ Existe - à refactoriser)
│   └── pesees/
│       └── SujetPeseeDetailScreen.tsx (❌ Nouveau)
│
├── components/
│   ├── pesees/ (❌ Nouveau dossier)
│   │   ├── PeseeDashboard.tsx (❌ Nouveau)
│   │   ├── PoidsEvolutionChart.tsx (⚠️ Améliorer existant)
│   │   ├── SujetPeseeCard.tsx (❌ Nouveau)
│   │   ├── AnimalsListSection.tsx (❌ Nouveau)
│   │   ├── BatchesListSection.tsx (⚠️ Améliorer existant)
│   │   └── AllSubjectsChart.tsx (❌ Nouveau)
│   │
│   ├── batch/
│   │   ├── BatchWeightEvolutionChart.tsx (✅ Existe)
│   │   └── BatchWeighingDetailsModal.tsx (✅ Existe)
│   │
│   └── WeightEvolutionChart.tsx (✅ Existe - mode individuel)
│
├── hooks/
│   ├── usePeseesStats.ts (❌ Nouveau)
│   ├── usePoidsEvolution.ts (❌ Nouveau)
│   └── useAnimalPeseeDetail.ts (❌ Nouveau)
│
└── utils/
    └── gmqCalculator.ts (❌ Nouveau)
```

---

## 2.8 - PLAN D'IMPLÉMENTATION

### Phase 3.1 : Backend (Priorité 1)
1. ✅ Créer `POST /api/pesees/stats`
2. ✅ Créer `POST /api/pesees/evolution`
3. ✅ Améliorer `GET /api/animaux/:animalId/pesees` (ajouter métriques)

### Phase 3.2 : Utilitaires (Priorité 1)
1. ✅ Créer `GMQCalculator.ts` avec toutes les fonctions

### Phase 3.3 : Hooks (Priorité 1)
1. ✅ Créer `usePeseesStats.ts`
2. ✅ Créer `usePoidsEvolution.ts`
3. ✅ Créer `useAnimalPeseeDetail.ts`

### Phase 3.4 : Composants Dashboard (Priorité 1)
1. ✅ Créer `PeseeDashboard.tsx`
2. ✅ Améliorer `PoidsEvolutionChart.tsx` pour mode adaptatif

### Phase 3.5 : Composants Liste (Priorité 1)
1. ✅ Créer `SujetPeseeCard.tsx`
2. ✅ Créer `AnimalsListSection.tsx`
3. ✅ Améliorer `BatchesListSection.tsx`

### Phase 3.6 : Écran Détail (Priorité 2)
1. ✅ Créer `SujetPeseeDetailScreen.tsx`
2. ✅ Créer composants onglets (MetricsTab, GraphTab, HistoryTab)

### Phase 3.7 : Graphique Tous Sujets (Priorité 2)
1. ✅ Créer `AllSubjectsChart.tsx`

### Phase 3.8 : Refactorisation Écran Principal (Priorité 1)
1. ✅ Refactoriser `WeighingScreen.tsx` pour utiliser tous les nouveaux composants
2. ✅ Intégrer la logique adaptative

### Phase 3.9 : Fonctionnalités Avancées (Priorité 3)
1. ✅ Export CSV/Excel
2. ✅ Export PNG des graphiques
3. ✅ Alertes et notifications
4. ✅ Objectifs de poids

---

## RÉSUMÉ DE L'ARCHITECTURE

### Principe clé : **Adaptatif mais Unifié**

- **Même structure** pour les deux modes
- **Composants communs** : Dashboard, Graphiques, Cartes
- **Composants spécifiques** : Listes (Animals vs Batches)
- **Même logique** : Calculs GMQ, détection retard, etc.
- **Données différentes** : Source adaptée au mode

### Avantages

1. ✅ **Cohérence visuelle** : Même design, même UX
2. ✅ **Maintenabilité** : Code partagé, moins de duplication
3. ✅ **Évolutivité** : Facile d'ajouter de nouvelles fonctionnalités aux deux modes
4. ✅ **Performance** : Hooks optimisés avec cache React Query

---

**Document créé le** : 2025-01-10  
**Dernière mise à jour** : 2025-01-10

