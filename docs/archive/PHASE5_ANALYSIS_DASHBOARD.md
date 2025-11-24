# 📊 Phase 5 : Analyse DashboardScreen.tsx

**Date:** 21 Novembre 2025  
**Fichier:** `src/screens/DashboardScreen.tsx`  
**Taille:** ~923 lignes  
**Objectif:** Refactoring pour améliorer maintenabilité

---

## 📋 État Actuel

### Métriques
```
Lignes totales:          ~923
Hooks useState:          9
Hooks useAppSelector:    8
Hooks useRef:            2
useEffect:               3
useFocusEffect:          1
Animations:              10+ Animated.Value
Fonctions helpers:       8+
JSX:                     ~300 lignes
```

### Complexité
- ⚠️ **Trop de responsabilités** dans un seul fichier
- ⚠️ **État local dispersé** (9 useState)
- ⚠️ **Logique métier mélangée** avec UI
- ⚠️ **Difficile à tester** (logique dans composant)

---

## 🎯 Objectifs du Refactoring

### 1. Extraire la Logique (Custom Hooks)
**Créer:** `hooks/useDashboardLogic.ts`

**Responsabilités:**
- Chargement des données
- Gestion du refresh
- Export PDF
- État de chargement

**Bénéfices:**
- ✅ Testable isolément
- ✅ Réutilisable
- ✅ Séparation responsabilités

---

### 2. Extraire les Animations (Animation Hook)
**Créer:** `hooks/useDashboardAnimations.ts`

**Responsabilités:**
- Gestion des Animated.Value
- Séquences d'animation
- Timings

**Bénéfices:**
- ✅ Code plus lisible
- ✅ Animations réutilisables
- ✅ Facile à modifier

---

### 3. Découper les Composants UI
**Créer:**
- `components/dashboard/DashboardHeader.tsx`
- `components/dashboard/DashboardStats.tsx`
- `components/dashboard/DashboardWidgets.tsx`
- `components/dashboard/DashboardSecondaryWidgets.tsx`

**Bénéfices:**
- ✅ Composants plus petits
- ✅ Plus facile à maintenir
- ✅ Réutilisables

---

## 🔍 Analyse Détaillée

### État Local (9 useState)

```typescript
// Navigation & Modals
const [searchModalVisible, setSearchModalVisible] = useState(false);
const [invitationsModalVisible, setInvitationsModalVisible] = useState(false);

// Loading States
const [isInitialLoading, setIsInitialLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [exportingPDF, setExportingPDF] = useState(false);

// Profil
const [profilPhotoUri, setProfilPhotoUri] = useState<string | null>(null);
const [profilInitiales, setProfilInitiales] = useState<string>('');
const [profilPrenom, setProfilPrenom] = useState<string>('');

// UI
const [greeting, setGreeting] = useState(() => { ... });
```

**À extraire dans hooks:**
- Loading states → `useDashboardData()`
- Profil → `useProfilData()`
- Modals → Rester dans composant (UI state)

---

### Selectors Redux (8 useAppSelector)

```typescript
const { projetActif, loading } = useAppSelector((state) => state.projet);
const { invitationsEnAttente } = useAppSelector((state) => state.collaboration);

// Pour export PDF
const animaux = useAppSelector(selectAllAnimaux);
const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
const chargesFixes = useAppSelector(selectAllChargesFixes);
const depensesPonctuelles = useAppSelector(selectAllDepensesPonctuelles);
const revenus = useAppSelector(selectAllRevenus);
const gestations = useAppSelector(selectAllGestations);
const sevrages = useAppSelector(selectAllSevrages);
```

**À extraire:**
- Tous les selectors PDF → `useDashboardExport()`

---

### Animations (10+ Animated.Value)

```typescript
const headerAnim = useRef(new Animated.Value(0)).current;
const mainWidgetsAnim = React.useMemo(() => [
  new Animated.Value(0),
  new Animated.Value(0),
  new Animated.Value(0),
  new Animated.Value(0),
], []);
const secondaryWidgetsAnim = React.useMemo(() => [
  new Animated.Value(0),
  new Animated.Value(0),
  new Animated.Value(0),
  new Animated.Value(0),
  new Animated.Value(0),
  new Animated.Value(0),
], []);

useEffect(() => {
  // Séquence d'animation complexe
  Animated.parallel([
    Animated.timing(headerAnim, { ... }),
    Animated.stagger(150, mainWidgetsAnim.map(anim => 
      Animated.spring(anim, { ... })
    )),
    Animated.stagger(100, secondaryWidgetsAnim.map(anim =>
      Animated.spring(anim, { ... })
    )),
  ]).start();
}, []);
```

**À extraire:**
- Tout → `useDashboardAnimations()`

---

### Fonctions Helpers (8+)

```typescript
// Chargement initial
const chargerDonnees = async () => { ... };

// Refresh
const onRefresh = async () => { ... };

// Export PDF
const handleExportPDF = async () => { ... };

// Profil
const chargerPhotoDeProfil = async () => { ... };

// Invitations
const handleShowInvitations = () => { ... };
const handleCloseInvitations = () => { ... };

// Navigation
const handleNavigateToProjet = () => { ... };
```

**À extraire:**
- `chargerDonnees` → `useDashboardData()`
- `onRefresh` → `useDashboardData()`
- `handleExportPDF` → `useDashboardExport()`
- `chargerPhotoDeProfil` → `useProfilData()`

---

## 🏗️ Architecture Proposée

### Structure de Fichiers

```
src/
├── screens/
│   └── DashboardScreen.tsx              (~200 lignes) ⬇️ -723
│
├── hooks/
│   ├── useDashboardLogic.ts             (~150 lignes) ✨ NEW
│   ├── useDashboardAnimations.ts        (~80 lignes)  ✨ NEW
│   ├── useDashboardExport.ts            (~100 lignes) ✨ NEW
│   └── useProfilData.ts                 (~50 lignes)  ✨ NEW
│
└── components/
    └── dashboard/
        ├── DashboardHeader.tsx          (~80 lignes)  ✨ NEW
        ├── DashboardStats.tsx           (~60 lignes)  ✨ NEW
        ├── DashboardMainWidgets.tsx     (~100 lignes) ✨ NEW
        └── DashboardSecondaryWidgets.tsx (~80 lignes) ✨ NEW
```

**Réduction:** 923 lignes → 200 lignes dans DashboardScreen (-78%) ✅

---

## 📝 Plan d'Action

### Étape 1: Créer les Hooks

#### 1.1 useDashboardData.ts
```typescript
export function useDashboardData(projetId: string | undefined) {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useAppDispatch();

  const chargerDonnees = async () => {
    if (!projetId) return;
    // Logique de chargement
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await chargerDonnees();
    setRefreshing(false);
  };

  useEffect(() => {
    chargerDonnees();
  }, [projetId]);

  return {
    isInitialLoading,
    refreshing,
    onRefresh,
    chargerDonnees,
  };
}
```

#### 1.2 useDashboardAnimations.ts
```typescript
export function useDashboardAnimations() {
  const headerAnim = useRef(new Animated.Value(0)).current;
  const mainWidgetsAnim = useMemo(() => [...], []);
  const secondaryWidgetsAnim = useMemo(() => [...], []);

  const startAnimations = useCallback(() => {
    Animated.parallel([...]).start();
  }, []);

  useEffect(() => {
    startAnimations();
  }, []);

  return {
    headerAnim,
    mainWidgetsAnim,
    secondaryWidgetsAnim,
  };
}
```

#### 1.3 useDashboardExport.ts
```typescript
export function useDashboardExport(projetId: string | undefined) {
  const [exportingPDF, setExportingPDF] = useState(false);
  
  // Selectors
  const animaux = useAppSelector(selectAllAnimaux);
  const chargesFixes = useAppSelector(selectAllChargesFixes);
  // ... autres selectors

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      await exportDashboardPDF({
        projetId,
        animaux,
        chargesFixes,
        // ... autres données
      });
    } catch (error) {
      Alert.alert('Erreur', 'Export PDF échoué');
    } finally {
      setExportingPDF(false);
    }
  };

  return { exportingPDF, handleExportPDF };
}
```

#### 1.4 useProfilData.ts
```typescript
export function useProfilData() {
  const [profilPhotoUri, setProfilPhotoUri] = useState<string | null>(null);
  const [profilInitiales, setProfilInitiales] = useState('');
  const [profilPrenom, setProfilPrenom] = useState('');

  const chargerPhotoDeProfil = async () => {
    // Logique de chargement
  };

  useFocusEffect(
    useCallback(() => {
      chargerPhotoDeProfil();
    }, [])
  );

  return {
    profilPhotoUri,
    profilInitiales,
    profilPrenom,
  };
}
```

---

### Étape 2: Créer les Composants UI

#### 2.1 DashboardHeader.tsx
```typescript
interface DashboardHeaderProps {
  greeting: string;
  projetActif: any;
  profilPhotoUri: string | null;
  profilInitiales: string;
  profilPrenom: string;
  invitationsCount: number;
  headerAnim: Animated.Value;
  onPressSearch: () => void;
  onPressInvitations: () => void;
  onPressProjet: () => void;
}

export default function DashboardHeader({
  greeting,
  projetActif,
  // ... props
}: DashboardHeaderProps) {
  // Render header
}
```

#### 2.2 DashboardMainWidgets.tsx
```typescript
interface DashboardMainWidgetsProps {
  animations: Animated.Value[];
  projetId: string;
  // ... autres props
}

export default function DashboardMainWidgets({
  animations,
  projetId,
}: DashboardMainWidgetsProps) {
  return (
    <>
      <Animated.View style={{ opacity: animations[0] }}>
        <OverviewWidget projetId={projetId} />
      </Animated.View>
      <Animated.View style={{ opacity: animations[1] }}>
        <ReproductionWidget projetId={projetId} />
      </Animated.View>
      {/* ... */}
    </>
  );
}
```

---

### Étape 3: Refactorer DashboardScreen

```typescript
export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { invitationsEnAttente } = useAppSelector((state) => state.collaboration);
  
  // Custom Hooks
  const { isInitialLoading, refreshing, onRefresh } = useDashboardData(projetActif?.id);
  const animations = useDashboardAnimations();
  const { exportingPDF, handleExportPDF } = useDashboardExport(projetActif?.id);
  const profil = useProfilData();
  
  // UI State (reste dans composant)
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [invitationsModalVisible, setInvitationsModalVisible] = useState(false);
  const [greeting, setGreeting] = useState(() => { ... });

  if (isInitialLoading) return <LoadingSpinner />;
  if (!projetActif) return <EmptyState />;

  return (
    <SafeAreaView>
      <ScrollView refreshControl={<RefreshControl ... />}>
        <DashboardHeader
          greeting={greeting}
          projetActif={projetActif}
          {...profil}
          invitationsCount={invitationsEnAttente.length}
          headerAnim={animations.headerAnim}
          onPressSearch={() => setSearchModalVisible(true)}
          onPressInvitations={() => setInvitationsModalVisible(true)}
          onPressProjet={() => navigation.navigate(SCREENS.PROJETS)}
        />

        <DashboardMainWidgets
          animations={animations.mainWidgetsAnim}
          projetId={projetActif.id}
        />

        <DashboardSecondaryWidgets
          animations={animations.secondaryWidgetsAnim}
          projetId={projetActif.id}
        />

        <AlertesWidget projetId={projetActif.id} />
      </ScrollView>

      {/* Modals */}
      <GlobalSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
      />
      <InvitationsModal
        visible={invitationsModalVisible}
        onClose={() => setInvitationsModalVisible(false)}
      />
    </SafeAreaView>
  );
}
```

**Résultat:** ~200 lignes au lieu de 923 (-78%) ✅

---

## ✅ Bénéfices du Refactoring

### Maintenabilité
- ✅ **Fichiers plus petits** (200 lignes vs 923)
- ✅ **Responsabilités séparées** (SRP)
- ✅ **Plus facile à comprendre**

### Testabilité
- ✅ **Hooks testables isolément**
- ✅ **Composants testables avec props**
- ✅ **Mocks plus simples**

### Réutilisabilité
- ✅ **Hooks réutilisables** dans autres screens
- ✅ **Composants réutilisables**
- ✅ **Logique centralisée**

### Performance
- ✅ **Memoization plus efficace**
- ✅ **Re-renders optimisés**
- ✅ **Composants plus petits = plus rapides**

---

## 📊 Comparaison Avant/Après

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| **Lignes DashboardScreen** | 923 | ~200 | -78% ✅ |
| **Hooks customs** | 0 | 4 | +4 ✅ |
| **Composants extraits** | 0 | 4 | +4 ✅ |
| **Testabilité** | ❌ Difficile | ✅ Facile | +100% ✅ |
| **Maintenabilité** | 3/10 | 9/10 | +6 ✅ |
| **Complexité cyclomatique** | Élevée | Faible | ⬇️ ✅ |

---

## 🎯 Prochaines Étapes

1. ✅ Créer `useDashboardData.ts`
2. ✅ Créer `useDashboardAnimations.ts`
3. ✅ Créer `useDashboardExport.ts`
4. ✅ Créer `useProfilData.ts`
5. ✅ Créer composants dashboard/
6. ✅ Refactorer DashboardScreen.tsx
7. ✅ Tester que tout fonctionne
8. ✅ Créer tests pour hooks
9. ✅ Documentation

---

## 💡 Considérations

### Approche Progressive
**Recommandé:** Refactorer étape par étape
1. Créer hooks → Tester
2. Créer composants → Tester
3. Intégrer dans DashboardScreen → Tester

**Éviter:** Tout refactorer d'un coup (risque de régression)

### Tests
**Créer tests pour:**
- `useDashboardData` (chargement, refresh)
- `useDashboardExport` (export PDF)
- Composants avec snapshot tests

### Backward Compatibility
- ✅ Ne pas casser l'existant
- ✅ Garder même comportement
- ✅ Tester exhaustivement

---

**Date:** 21 Novembre 2025  
**Status:** 📋 Analyse complète  
**Prochaine étape:** Créer les hooks customs

---

**Version:** 1.0.0

