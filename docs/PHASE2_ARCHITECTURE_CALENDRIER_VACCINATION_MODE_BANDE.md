# 🏗️ PHASE 2 : ARCHITECTURE - Calendrier de Vaccination Mode Bande

**Date** : 2026-01-05  
**Objectif** : Proposer l'architecture complète pour implémenter l'affichage des sujets en retard dans le mode bande

---

## 📋 2.1 - STRUCTURE DU CALENDRIER UNIFIÉ

### Principe : Même fonction, comportement adaptatif

La fonction `renderCalendrier` sera adaptée pour détecter le mode et afficher soit :
- **Mode individuel** : Liste plate d'animaux (comportement actuel)
- **Mode bande** : Liste groupée par bande avec expansion/collapse

---

## 🔧 2.2 - MODIFICATIONS À APPORTER

### A) Fonction `renderCalendrier` - Adaptation

**Fichier** : `src/components/VaccinationsComponentAccordion.tsx`

**Changements** :
1. Détecter le mode (`isModeBatch`)
2. Si mode bande : calculer les animaux groupés par bande
3. Si mode individuel : comportement actuel (inchangé)

**Structure proposée** :

```typescript
const renderCalendrier = (type: TypeProphylaxie, couleur: string) => {
  const animauxActifs = (animaux || []).filter((a) => a.statut === 'actif');

  if (isModeBatch) {
    // MODE BANDE : Grouper par bande
    return renderCalendrierBande(type, couleur, animauxActifs);
  } else {
    // MODE INDIVIDUEL : Comportement actuel
    return renderCalendrierIndividuel(type, couleur, animauxActifs);
  }
};
```

---

## 📦 2.3 - NOUVELLE FONCTION : `renderCalendrierBande`

### Logique de calcul

**Étapes** :
1. Calculer les animaux en retard (même logique que mode individuel)
2. Grouper les animaux par `batch_id`
3. Pour chaque bande, compter les sujets en retard
4. Afficher les bandes avec expansion/collapse

**Code proposé** :

```typescript
const renderCalendrierBande = (
  type: TypeProphylaxie,
  couleur: string,
  animauxActifs: ProductionAnimal[]
) => {
  // 1. Calculer les animaux en retard (même logique que mode individuel)
  const animauxCalendrier = calculerAnimauxCalendrier(type, animauxActifs);

  // 2. Filtrer uniquement les animaux en retard
  const animauxEnRetard = animauxCalendrier.filter((item) => item.enRetard);

  // 3. Grouper par batch_id
  const animauxParBande = useMemo(() => {
    const grouped: { [batchId: string]: typeof animauxEnRetard } = {};
    const sansBande: typeof animauxEnRetard = [];

    animauxEnRetard.forEach((item) => {
      const batchId = item.animal.batch_id;
      if (!batchId) {
        sansBande.push(item);
        return;
      }

      if (!grouped[batchId]) {
        grouped[batchId] = [];
      }
      grouped[batchId].push(item);
    });

    return { grouped, sansBande };
  }, [animauxEnRetard]);

  // 4. Récupérer les informations des bandes
  const bandesAvecRetards = useMemo(() => {
    return Object.entries(animauxParBande.grouped).map(([batchId, animaux]) => {
      const batch = batches.find((b) => b.id === batchId);
      return {
        batchId,
        batch: batch || null,
        animaux,
        nombreEnRetard: animaux.length,
      };
    });
  }, [animauxParBande.grouped, batches]);

  // 5. Trier : bandes avec le plus de retards en premier
  bandesAvecRetards.sort((a, b) => b.nombreEnRetard - a.nombreEnRetard);

  return (
    <View
      style={[
        styles.calendrierContainer,
        { backgroundColor: `${couleur}10`, borderColor: couleur },
      ]}
    >
      <Text style={[styles.calendrierTitre, { color: colors.text }]}>
        📅 Calendrier de vaccination - {TYPE_PROPHYLAXIE_LABELS[type]}
      </Text>

      {bandesAvecRetards.length === 0 && animauxParBande.sansBande.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucun sujet en retard pour ce traitement
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.calendrierListe} nestedScrollEnabled>
          {/* Afficher les bandes avec retards */}
          {bandesAvecRetards.map((bandeData) => (
            <BandeEnRetardGroup
              key={bandeData.batchId}
              bandeData={bandeData}
              type={type}
              couleur={couleur}
              onVaccinerBande={(batchId, animauxIds) => {
                // Pré-remplir le formulaire avec la bande
                const batch = batches.find((b) => b.id === batchId);
                setSelectedBatch(batch || null);
                setNombreSujetsVaccines(animauxIds.length.toString());
                toggleSection(type);
              }}
            />
          ))}

          {/* Afficher les animaux sans bande */}
          {animauxParBande.sansBande.length > 0 && (
            <AnimauxSansBandeGroup
              animaux={animauxParBande.sansBande}
              type={type}
              couleur={couleur}
              onVaccinerAnimal={(animalId) => {
                setAnimauxSelectionnes([animalId]);
                toggleSection(type);
              }}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
};
```

---

## 🧩 2.4 - NOUVEAU COMPOSANT : `BandeEnRetardGroup`

**Fichier** : `src/components/sante/BandeEnRetardGroup.tsx` (nouveau fichier)

**Responsabilités** :
- Afficher une bande avec le nombre de sujets en retard
- Permettre l'expansion pour voir la liste des animaux
- Bouton "Vacciner cette bande"

**Interface** :

```typescript
interface BandeEnRetardGroupProps {
  bandeData: {
    batchId: string;
    batch: Batch | null;
    animaux: AnimalCalendrier[];
    nombreEnRetard: number;
  };
  type: TypeProphylaxie;
  couleur: string;
  onVaccinerBande: (batchId: string, animauxIds: string[]) => void;
}
```

**Structure du composant** :

```typescript
const BandeEnRetardGroup: React.FC<BandeEnRetardGroupProps> = ({
  bandeData,
  type,
  couleur,
  onVaccinerBande,
}) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const animauxIds = bandeData.animaux.map((a) => a.animal.id);

  return (
    <View
      style={[
        styles.bandeGroupContainer,
        {
          backgroundColor: colors.surface,
          borderLeftColor: colors.error,
          ...colors.shadow.small,
        },
      ]}
    >
      {/* Header de la bande */}
      <TouchableOpacity
        style={styles.bandeGroupHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.bandeGroupHeaderLeft}>
          <Ionicons name="home" size={20} color={couleur} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.bandeGroupName, { color: colors.text }]}>
              {bandeData.batch?.pen_name || `Bande ${bandeData.batchId.slice(0, 6)}`}
            </Text>
            <Text style={[styles.bandeGroupMeta, { color: colors.textSecondary }]}>
              {bandeData.nombreEnRetard} sujet{bandeData.nombreEnRetard > 1 ? 's' : ''} en retard
              {bandeData.batch && ` • ${bandeData.batch.total_count} sujet(s) total`}
            </Text>
          </View>
        </View>

        <View style={[styles.badgeRetard, { backgroundColor: colors.error }]}>
          <Text style={styles.badgeRetardTexte}>{bandeData.nombreEnRetard}</Text>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {/* Liste des animaux (expandable) */}
      {expanded && (
        <View style={styles.bandeGroupAnimaux}>
          {bandeData.animaux.map((item) => (
            <AnimalEnRetardItem
              key={item.animal.id}
              item={item}
              couleur={couleur}
            />
          ))}

          {/* Bouton vacciner toute la bande */}
          <TouchableOpacity
            style={[styles.boutonVaccinerBande, { backgroundColor: couleur }]}
            onPress={() => onVaccinerBande(bandeData.batchId, animauxIds)}
          >
            <Ionicons name="medical" size={16} color="#FFF" />
            <Text style={styles.boutonVaccinerBandeTexte}>
              Vacciner cette bande ({bandeData.nombreEnRetard})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
```

---

## 🧩 2.5 - NOUVEAU COMPOSANT : `AnimalEnRetardItem`

**Fichier** : `src/components/sante/AnimalEnRetardItem.tsx` (nouveau fichier, ou extrait de `renderCalendrier`)

**Responsabilités** :
- Afficher un animal en retard (réutilisable pour mode individuel et bande)
- Afficher les informations : nom, âge, dernier traitement, prochain traitement

**Code proposé** :

```typescript
interface AnimalEnRetardItemProps {
  item: {
    animal: ProductionAnimal;
    nom: string;
    categorie: string;
    ageJours: number;
    prochainTraitement?: CalendrierTypeAge;
    dernierTraitement?: Vaccination;
    enRetard: boolean;
  };
  couleur: string;
  showVaccinerButton?: boolean; // Optionnel : afficher le bouton "Vacciner maintenant"
  onVacciner?: (animalId: string) => void;
}

const AnimalEnRetardItem: React.FC<AnimalEnRetardItemProps> = ({
  item,
  couleur,
  showVaccinerButton = false,
  onVacciner,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.animalEnRetardItem,
        {
          backgroundColor: colors.background,
          borderLeftColor: item.enRetard ? colors.error : couleur,
        },
      ]}
    >
      <View style={styles.animalEnRetardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.animalEnRetardNom, { color: colors.text }]}>
            {item.nom}
          </Text>
          <Text style={[styles.animalEnRetardDetails, { color: colors.textSecondary }]}>
            {item.categorie} • {item.ageJours}j
          </Text>
        </View>
        {item.enRetard && (
          <View style={[styles.badgeRetard, { backgroundColor: colors.error }]}>
            <Text style={styles.badgeRetardTexte}>En retard</Text>
          </View>
        )}
      </View>

      {item.dernierTraitement && (
        <View style={styles.animalEnRetardRow}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={[styles.animalEnRetardTexte, { color: colors.textSecondary }]}>
            Dernier : {new Date(item.dernierTraitement.date_vaccination).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      )}

      {item.prochainTraitement && (
        <View style={styles.animalEnRetardRow}>
          <Ionicons
            name="alarm"
            size={14}
            color={item.enRetard ? colors.error : couleur}
          />
          <Text style={[styles.animalEnRetardTexte, { color: colors.textSecondary }]}>
            {item.prochainTraitement.nom_traitement} ({item.prochainTraitement.age_display})
          </Text>
        </View>
      )}

      {showVaccinerButton && onVacciner && (
        <TouchableOpacity
          style={[styles.boutonVaccinerMaintenant, { backgroundColor: couleur }]}
          onPress={() => onVacciner(item.animal.id)}
        >
          <Ionicons name="medical" size={16} color="#FFF" />
          <Text style={styles.boutonVaccinerMaintenantTexte}>Vacciner maintenant</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
```

---

## 🧩 2.6 - NOUVEAU COMPOSANT : `AnimauxSansBandeGroup`

**Fichier** : `src/components/sante/AnimauxSansBandeGroup.tsx` (nouveau fichier)

**Responsabilités** :
- Afficher les animaux en retard qui n'ont pas de `batch_id`
- Grouper sous "Sans bande"

**Code proposé** :

```typescript
interface AnimauxSansBandeGroupProps {
  animaux: AnimalCalendrier[];
  type: TypeProphylaxie;
  couleur: string;
  onVaccinerAnimal: (animalId: string) => void;
}

const AnimauxSansBandeGroup: React.FC<AnimauxSansBandeGroupProps> = ({
  animaux,
  type,
  couleur,
  onVaccinerAnimal,
}) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={[
        styles.bandeGroupContainer,
        {
          backgroundColor: colors.surface,
          borderLeftColor: colors.warning,
          ...colors.shadow.small,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.bandeGroupHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.bandeGroupHeaderLeft}>
          <Ionicons name="warning" size={20} color={colors.warning} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.bandeGroupName, { color: colors.text }]}>
              Sans bande
            </Text>
            <Text style={[styles.bandeGroupMeta, { color: colors.textSecondary }]}>
              {animaux.length} sujet{animaux.length > 1 ? 's' : ''} en retard
            </Text>
          </View>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.bandeGroupAnimaux}>
          {animaux.map((item) => (
            <AnimalEnRetardItem
              key={item.animal.id}
              item={item}
              couleur={couleur}
              showVaccinerButton={true}
              onVacciner={onVaccinerAnimal}
            />
          ))}
        </View>
      )}
    </View>
  );
};
```

---

## 🔄 2.7 - FONCTION UTILITAIRE : `calculerAnimauxCalendrier`

**Fichier** : `src/components/VaccinationsComponentAccordion.tsx` (nouvelle fonction)

**Responsabilités** :
- Extraire la logique de calcul des animaux en retard
- Réutilisable pour mode individuel et mode bande

**Code proposé** :

```typescript
interface AnimalCalendrier {
  animal: ProductionAnimal;
  nom: string;
  categorie: string;
  ageJours: number;
  prochainTraitement?: CalendrierTypeAge;
  dernierTraitement?: Vaccination;
  enRetard: boolean;
}

const calculerAnimauxCalendrier = (
  type: TypeProphylaxie,
  animauxActifs: ProductionAnimal[]
): AnimalCalendrier[] => {
  return animauxActifs
    .map((animal) => {
      if (!animal.date_naissance) return null;

      const ageJours = calculerAgeJours(animal.date_naissance);
      const traitementsType = CALENDRIER_VACCINAL_TYPE.filter(
        (cal) => cal.type_prophylaxie === type
      );

      const prochainTraitement = traitementsType.find((traitement) => {
        const aRecuTraitement = (vaccinations || []).some(
          (v) =>
            animalIncludedInVaccination(v.animal_ids, animal.id) &&
            v.type_prophylaxie === traitement.type_prophylaxie &&
            v.statut === 'effectue'
        );
        return !aRecuTraitement && traitement.age_jours <= ageJours + 7;
      });

      const dernierTraitement = (vaccinations || [])
        .filter(
          (v) =>
            animalIncludedInVaccination(v.animal_ids, animal.id) &&
            v.type_prophylaxie === type
        )
        .sort(
          (a, b) =>
            new Date(b.date_vaccination).getTime() - new Date(a.date_vaccination).getTime()
        )[0];

      if (!prochainTraitement && !dernierTraitement) return null;

      const nom = animal.nom || animal.code || `Animal ${animal.id.slice(0, 6)}`;
      const categorie = getCategorieAnimal(animal);

      return {
        animal,
        nom,
        categorie,
        ageJours,
        prochainTraitement,
        dernierTraitement,
        enRetard: prochainTraitement && prochainTraitement.age_jours < ageJours,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => {
      // En retard d'abord
      if (a.enRetard && !b.enRetard) return -1;
      if (!a.enRetard && b.enRetard) return 1;
      // Puis par âge décroissant
      return b.ageJours - a.ageJours;
    });
};
```

---

## 🎨 2.8 - STYLES À AJOUTER

**Fichier** : `src/components/VaccinationsComponentAccordion.tsx` (section styles)

**Nouveaux styles** :

```typescript
const styles = StyleSheet.create({
  // ... styles existants ...

  // Styles pour le mode bande
  bandeGroupContainer: {
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
  },
  bandeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bandeGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bandeGroupName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  bandeGroupMeta: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  bandeGroupAnimaux: {
    marginTop: SPACING.sm,
    paddingLeft: SPACING.md,
    gap: SPACING.xs,
  },
  animalEnRetardItem: {
    borderRadius: BORDER_RADIUS.xs,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderLeftWidth: 3,
  },
  animalEnRetardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  animalEnRetardNom: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  animalEnRetardDetails: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  animalEnRetardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs / 2,
  },
  animalEnRetardTexte: {
    fontSize: FONT_SIZES.xs,
    marginLeft: 6,
  },
  boutonVaccinerBande: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.xs,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  boutonVaccinerBandeTexte: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFF',
  },
});
```

---

## 📊 2.9 - DIAGRAMME DE FLUX

```
renderCalendrier(type, couleur)
    │
    ├─ isModeBatch ?
    │   │
    │   ├─ OUI → renderCalendrierBande()
    │   │   │
    │   │   ├─ calculerAnimauxCalendrier() → Liste d'animaux en retard
    │   │   │
    │   │   ├─ Grouper par batch_id
    │   │   │
    │   │   ├─ Pour chaque bande → BandeEnRetardGroup
    │   │   │   ├─ Header avec nom bande + nombre en retard
    │   │   │   ├─ Expansion → Liste AnimalEnRetardItem
    │   │   │   └─ Bouton "Vacciner cette bande"
    │   │   │
    │   │   └─ Animaux sans bande → AnimauxSansBandeGroup
    │   │
    │   └─ NON → renderCalendrierIndividuel() (comportement actuel)
    │       └─ Liste plate d'animaux avec badge "En retard"
```

---

## ✅ 2.10 - RÉSUMÉ DES MODIFICATIONS

### Fichiers à modifier :

1. **`src/components/VaccinationsComponentAccordion.tsx`** :
   - ✅ Adapter `renderCalendrier` pour détecter le mode
   - ✅ Créer `renderCalendrierBande` (nouveau)
   - ✅ Créer `renderCalendrierIndividuel` (extraire logique actuelle)
   - ✅ Créer `calculerAnimauxCalendrier` (fonction utilitaire)
   - ✅ Ajouter styles pour mode bande

### Fichiers à créer :

2. **`src/components/sante/BandeEnRetardGroup.tsx`** (nouveau)
   - Composant pour afficher une bande avec animaux en retard

3. **`src/components/sante/AnimalEnRetardItem.tsx`** (nouveau)
   - Composant réutilisable pour afficher un animal en retard

4. **`src/components/sante/AnimauxSansBandeGroup.tsx`** (nouveau)
   - Composant pour afficher les animaux sans bande

---

## 🎯 2.11 - POINTS D'ATTENTION

### ⚠️ Vérifications nécessaires :

1. **Données des animaux** :
   - Les animaux en mode bande ont-ils un `batch_id` dans `production_animaux` ?
   - Ou faut-il charger depuis `batch_pigs` ?

2. **Vaccinations en mode bande** :
   - Les vaccinations avec `batch_id` sont-elles liées aux animaux individuels ?
   - Comment vérifier si un animal d'une bande a été vacciné ?

3. **Performance** :
   - Si beaucoup d'animaux, le calcul peut être lent
   - Considérer la mémorisation (`useMemo`)

---

## 📝 2.12 - PROCHAINES ÉTAPES

1. ✅ **ARCHITECTURE** (ce document)
2. ⏳ **IMPLÉMENTATION** : Coder les modifications
3. ⏳ **TESTS** : Valider dans les deux modes
4. ⏳ **OPTIMISATION** : Vérifier les performances

---

**Date de création** : 2026-01-05  
**Auteur** : Architecture proposée  
**Statut** : ✅ Phase 2 complétée - Prêt pour implémentation

