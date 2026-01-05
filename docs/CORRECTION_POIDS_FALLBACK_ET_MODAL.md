# Correction du système de poids avec fallback et modal de saisie

## Problème identifié

Les poids affichaient toujours "0.0 kg" dans l'ajout de sujets depuis le marketplace. Il était impossible de mettre en vente un sujet dont le poids est nul. Le système ne récupérait pas le poids à l'arrivée (`poids_initial`) comme fallback et ne permettait pas à l'utilisateur de renseigner manuellement le poids.

## Solution appliquée

### 1. Système de fallback pour les poids

**Hiérarchie de récupération du poids :**
1. **Poids manuel** : Poids saisi par l'utilisateur via le modal (priorité)
2. **Pesées récentes** : Dernière pesée enregistrée (map local pour mode batch)
3. **Pesées Redux** : Dernière pesée depuis le sélecteur Redux (mode individuel)
4. **Poids à l'arrivée** : `poids_initial` du sujet (fallback par défaut)
5. **Aucun poids** : Retourne 0 si aucun poids n'est disponible

**Code :**
```typescript
const getCurrentWeight = (subject: ProductionAnimal): number => {
  const animalId = subject.id;
  
  // 1. Poids manuel saisi par l'utilisateur (priorité)
  if (manualWeights[animalId] && manualWeights[animalId] > 0) {
    return manualWeights[animalId];
  }
  
  // 2. Pesées récentes (map local pour mode batch)
  const peseesLocal = peseesParAnimal[animalId];
  if (peseesLocal && peseesLocal.length > 0) {
    const sorted = [...peseesLocal].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const poids = sorted[0].poids_kg;
    if (poids > 0) return poids;
  }
  
  // 3. Pesées récentes (sélecteur Redux pour mode individuel)
  const peseesRedux = peseesParAnimalRedux[animalId] || [];
  if (peseesRedux.length > 0) {
    const sorted = [...peseesRedux].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const poids = sorted[0].poids_kg;
    if (poids > 0) return poids;
  }
  
  // 4. Poids à l'arrivée (poids_initial) comme fallback
  if (subject.poids_initial && subject.poids_initial > 0) {
    return subject.poids_initial;
  }
  
  // 5. Aucun poids disponible
  return 0;
};
```

### 2. Modal de saisie du poids

**Fonctionnalités :**
- Affichage automatique si un sujet sans poids est sélectionné lors de la soumission
- Bouton "Renseigner le poids" visible sur chaque sujet sans poids
- Validation du poids (doit être > 0)
- Sauvegarde du poids saisi dans `manualWeights`

**Code :**
```typescript
// État pour le modal
const [showWeightModal, setShowWeightModal] = useState(false);
const [weightModalSubject, setWeightModalSubject] = useState<ProductionAnimal | null>(null);
const [weightInput, setWeightInput] = useState('');
const [manualWeights, setManualWeights] = useState<Record<string, number>>({});

// Ouvrir le modal
const openWeightModal = (subject: ProductionAnimal) => {
  setWeightModalSubject(subject);
  setWeightInput(manualWeights[subject.id]?.toString() || '');
  setShowWeightModal(true);
};

// Confirmer le poids
const confirmWeight = () => {
  if (!weightModalSubject) return;
  
  const poids = parseFloat(weightInput);
  if (isNaN(poids) || poids <= 0) {
    Alert.alert('Erreur', 'Veuillez entrer un poids valide (supérieur à 0)');
    return;
  }
  
  setManualWeights((prev) => ({
    ...prev,
    [weightModalSubject.id]: poids,
  }));
  setShowWeightModal(false);
  setWeightModalSubject(null);
  setWeightInput('');
};
```

### 3. Validation avant soumission

**Vérification :**
- Avant de soumettre, vérifier que tous les sujets sélectionnés ont un poids valide
- Si un sujet n'a pas de poids, afficher une alerte et ouvrir le modal pour ce sujet
- Empêcher la soumission si le poids est toujours null

**Code :**
```typescript
// Vérifier que tous les sujets sélectionnés ont un poids valide
const selectedSubjects = availableSubjects.filter((s) => selectedIds.has(s.id));
const subjectsWithoutWeight = selectedSubjects.filter((s) => !hasValidWeight(s));

if (subjectsWithoutWeight.length > 0) {
  // Demander le poids pour le premier sujet sans poids
  const firstSubject = subjectsWithoutWeight[0];
  Alert.alert(
    'Poids manquant',
    `Le sujet "${firstSubject.code || firstSubject.id}" n'a pas de poids. Veuillez renseigner le poids pour continuer.`,
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Renseigner',
        onPress: () => openWeightModal(firstSubject),
      },
    ]
  );
  return;
}
```

### 4. Affichage visuel des sujets sans poids

**Indicateurs :**
- Texte "Poids manquant" en rouge pour les sujets sans poids
- Bouton "Renseigner le poids" visible sur chaque sujet sans poids
- Poids affiché normalement si disponible

**Code :**
```typescript
<Text style={[styles.subjectDetails, { color: colors.textSecondary }]}>
  {subject.nom ? `${subject.nom} • ` : ''}
  {subject.race || 'Race non spécifiée'} •{' '}
  {hasValidWeight(subject) ? (
    <Text style={{ color: colors.textSecondary }}>
      {getCurrentWeight(subject).toFixed(1)} kg
    </Text>
  ) : (
    <Text style={{ color: colors.error }}>
      Poids manquant
    </Text>
  )}{' '}
  • {calculateAgeInMonths(subject.date_naissance)} mois
</Text>
{!hasValidWeight(subject) && (
  <TouchableOpacity
    onPress={() => openWeightModal(subject)}
    style={[styles.weightButton, { backgroundColor: colors.primary + '15' }]}
  >
    <Ionicons name="scale-outline" size={16} color={colors.primary} />
    <Text style={[styles.weightButtonText, { color: colors.primary }]}>
      Renseigner le poids
    </Text>
  </TouchableOpacity>
)}
```

### 5. Utilisation du poids dans la création de listing

**Mode batch :**
```typescript
// Trouver le sujet correspondant pour utiliser getCurrentWeight
const subject = localSubjects.find((s) => s.id === pig.id);
if (!subject) continue;

// Récupérer le poids avec fallback
let poidsActuel = getCurrentWeight(subject);
```

**Mode individuel :**
```typescript
// Récupérer le poids avec fallback (pesée → poids_initial → poids manuel)
let poidsActuel = getCurrentWeight(subject);
```

## Impact

### Avant
- ❌ Poids toujours à "0.0 kg"
- ❌ Impossible de mettre en vente un sujet sans poids
- ❌ Pas de fallback vers `poids_initial`
- ❌ Pas de moyen de renseigner le poids manuellement

### Après
- ✅ Poids récupéré depuis pesées récentes
- ✅ Fallback automatique vers `poids_initial` si pas de pesée
- ✅ Modal pour renseigner le poids si nécessaire
- ✅ Validation avant soumission
- ✅ Affichage visuel des sujets sans poids
- ✅ Impossible de mettre en vente un sujet sans poids (bloqué par validation)

## Fichiers modifiés

- `src/components/marketplace/BatchAddModal.tsx` :
  - Ajout du système de fallback pour les poids
  - Ajout du modal de saisie du poids
  - Ajout de la validation avant soumission
  - Ajout de l'affichage visuel des sujets sans poids
  - Utilisation de `getCurrentWeight` dans la création de listing

## Tests recommandés

1. **Test du fallback vers `poids_initial`** :
   - Créer un sujet avec `poids_initial` mais sans pesée
   - Ouvrir l'écran "Ajouter des sujets en vente"
   - ✅ Vérifier que le poids affiché correspond à `poids_initial`

2. **Test du modal de saisie** :
   - Créer un sujet sans pesée ni `poids_initial`
   - Ouvrir l'écran "Ajouter des sujets en vente"
   - ✅ Vérifier que "Poids manquant" est affiché
   - ✅ Cliquer sur "Renseigner le poids"
   - ✅ Saisir un poids et confirmer
   - ✅ Vérifier que le poids est affiché

3. **Test de la validation** :
   - Sélectionner un sujet sans poids
   - Entrer un prix/kg
   - Accepter les conditions
   - Cliquer sur "Mettre en vente"
   - ✅ Vérifier qu'une alerte demande de renseigner le poids
   - ✅ Renseigner le poids
   - ✅ Vérifier que la soumission fonctionne

4. **Test de la hiérarchie** :
   - Créer un sujet avec pesée, `poids_initial`, et poids manuel
   - ✅ Vérifier que le poids manuel est utilisé (priorité)
   - Supprimer le poids manuel
   - ✅ Vérifier que la pesée est utilisée
   - Supprimer la pesée
   - ✅ Vérifier que `poids_initial` est utilisé

## Notes

- Le système de fallback garantit qu'un poids est toujours disponible si possible
- Le modal permet à l'utilisateur de renseigner le poids même si aucune pesée n'est disponible
- La validation empêche la mise en vente de sujets sans poids
- Les poids manuels sont sauvegardés dans l'état local et persistent pendant la session

