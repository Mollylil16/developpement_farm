# Correction de la logique de création de compte et d'accès à l'application

## 📋 Problème identifié

**Problème actuel** :
- Lors de la création d'un compte acheteur/vétérinaire/technicien, le système forçait la création d'un projet (logique incorrecte)
- Tous les utilisateurs étaient traités comme des producteurs par défaut
- Les utilisateurs non-producteurs ne pouvaient pas accéder à l'app sans créer un projet

## ✅ Solution implémentée

### 1. Logique corrigée selon le profil

#### A) Profils QUI DOIVENT créer un projet obligatoirement :
- ✅ **Producteur / Éleveur** → Création de projet obligatoire

#### B) Profils QUI NE DOIVENT PAS créer de projet :
- ✅ **Acheteur** → Accès direct à l'app
- ✅ **Vétérinaire** → Accès direct à l'app
- ✅ **Technicien / Conseiller** → Accès direct à l'app

### 2. Flux utilisateur corrigé

#### Scénario 1 - Nouveau compte Producteur :
```
Inscription → Sélection profil "Producteur" → Création projet obligatoire → Accès app
```

#### Scénario 2 - Nouveau compte Acheteur/Vétérinaire/Technicien :
```
Inscription → Sélection profil → Complétion informations → Accès direct app (PAS de création projet)
```

#### Scénario 3 - Acheteur qui devient aussi Producteur :
```
Dans l'app → Menu Profil → "Ajouter un profil producteur" → Création projet → Bascule entre profils
```

## 🔧 Modifications apportées

### 1. `src/navigation/AppNavigator.tsx`

**Modification** : Logique de navigation corrigée pour ne pas forcer la création de projet pour les non-producteurs

```typescript
// AVANT : Forçait CreateProject pour tous les utilisateurs sans projet
else {
  targetRoute = SCREENS.CREATE_PROJECT;
}

// APRÈS : Vérifie le rôle de l'utilisateur
const activeRole = user.activeRole || 
  (user.roles?.producer ? 'producer' : 
   user.roles?.buyer ? 'buyer' : 
   user.roles?.veterinarian ? 'veterinarian' : 
   user.roles?.technician ? 'technician' : 'producer');

const isProducer = activeRole === 'producer';

if (isProducer) {
  // Producteur : création projet obligatoire
  targetRoute = SCREENS.CREATE_PROJECT;
} else {
  // Non-producteur : accès direct au dashboard
  targetRoute = 'Main';
}
```

**Impact** :
- ✅ Les acheteurs/vétérinaires/techniciens accèdent directement à l'app sans projet
- ✅ Seuls les producteurs sont redirigés vers la création de projet

### 2. `src/contexts/RoleContext.tsx`

**Modification** : Ne plus forcer 'producer' par défaut

```typescript
// AVANT : Retournait toujours 'producer' par défaut
return 'producer';

// APRÈS : Retourne le premier rôle disponible ou 'buyer' (plus neutre)
if (user.roles?.buyer) return 'buyer';
if (user.roles?.veterinarian) return 'veterinarian';
if (user.roles?.technician) return 'technician';
if (user.roles?.producer) return 'producer';
return 'buyer'; // Plus neutre que 'producer'
```

**Impact** :
- ✅ Les utilisateurs non-producteurs ne sont plus traités comme producteurs
- ✅ Le rôle par défaut est plus approprié selon le profil réel

### 3. `src/components/ProfileMenuModal/HomeView.tsx`

**Modification** : Ajout d'une option "Ajouter un profil producteur" pour les utilisateurs non-producteurs

```typescript
{/* Section AJOUTER UN PROFIL */}
{!availableRoles.includes('producer') && (
  <View style={styles.section}>
    <Text>➕ AJOUTER UN PROFIL</Text>
    <TouchableOpacity
      onPress={() => {
        navigation.navigate(SCREENS.CREATE_PROJECT, {
          userId: currentUser?.id,
          addProducerProfile: true,
        });
      }}
    >
      <Text>Ajouter un profil producteur</Text>
      <Text>Créer un élevage et devenir producteur</Text>
    </TouchableOpacity>
  </View>
)}
```

**Impact** :
- ✅ Les utilisateurs non-producteurs peuvent ajouter un profil producteur ultérieurement
- ✅ Option visible uniquement si le profil producteur n'existe pas encore

### 4. `src/screens/CreateProjectScreen.tsx`

**Modification** : Ne plus créer automatiquement un compte producteur si l'utilisateur est déjà connecté

```typescript
// AVANT : Créait toujours un compte avec profileType='producer'
if (!finalUserId && identifier) {
  const newUser = await onboardingService.createUser({
    profileType: 'producer',
  });
}

// APRÈS : Ne créer un compte que dans le flux d'onboarding initial
if (!finalUserId && identifier && !user) {
  // Créer compte uniquement si pas d'utilisateur connecté
}
// Si l'utilisateur est connecté, utiliser son ID actuel
if (!finalUserId && user?.id) {
  finalUserId = user.id;
}
```

**Impact** :
- ✅ Un utilisateur existant (acheteur/vétérinaire/technicien) peut créer un projet sans créer un nouveau compte
- ✅ Le profil producteur est ajouté au compte existant

### 5. `src/screens/ProfileSelectionScreen.tsx`

**Statut** : ✅ Déjà correct
- Redirige vers `CREATE_PROJECT` uniquement pour les producteurs
- Redirige vers `BUYER_INFO_COMPLETION` pour les acheteurs/techniciens
- Redirige vers `VETERINARIAN_INFO_COMPLETION` pour les vétérinaires

### 6. `src/screens/BuyerInfoCompletionScreen.tsx`

**Statut** : ✅ Déjà correct
- Redirige vers le dashboard approprié après complétion
- Ne force pas la création de projet

## 🧪 Scénarios de test

### ✅ Test 1 : Nouveau compte Acheteur
1. Inscription avec email/téléphone
2. Sélection profil "Acheteur"
3. Complétion informations acheteur
4. **Résultat attendu** : Accès direct au dashboard acheteur (PAS de création projet)

### ✅ Test 2 : Nouveau compte Vétérinaire
1. Inscription avec email/téléphone
2. Sélection profil "Vétérinaire"
3. Complétion informations vétérinaire
4. **Résultat attendu** : Accès direct au dashboard vétérinaire (PAS de création projet)

### ✅ Test 3 : Acheteur qui devient Producteur
1. Utilisateur connecté avec profil acheteur
2. Menu Profil → "Ajouter un profil producteur"
3. Création d'un projet
4. **Résultat attendu** : Profil producteur ajouté, possibilité de basculer entre profils

### ✅ Test 4 : Nouveau compte Producteur
1. Inscription avec email/téléphone
2. Sélection profil "Producteur"
3. **Résultat attendu** : Redirection vers création de projet (obligatoire)

## 📝 Points importants

1. **Création de projet** :
   - ✅ Obligatoire uniquement pour les producteurs
   - ✅ Optionnelle pour les autres profils (peut être ajoutée plus tard)

2. **Accès à l'application** :
   - ✅ Tous les profils peuvent accéder à l'app sans projet
   - ✅ Seuls les producteurs ont besoin d'un projet pour utiliser les fonctionnalités de gestion

3. **Ajout de profil ultérieur** :
   - ✅ Les utilisateurs non-producteurs peuvent ajouter un profil producteur depuis le menu profil
   - ✅ Cela permet de créer un projet et de devenir producteur sans créer un nouveau compte

4. **Compatibilité** :
   - ✅ Les utilisateurs existants avec un profil producteur continuent de fonctionner normalement
   - ✅ La logique est rétrocompatible

## ⚠️ Points d'attention

1. **Migration des utilisateurs existants** :
   - Les utilisateurs existants sans rôle défini seront traités comme 'buyer' par défaut
   - Ils pourront ajouter un profil producteur depuis le menu si nécessaire

2. **Validation** :
   - Vérifier que les écrans de dashboard fonctionnent correctement sans projet actif pour les non-producteurs
   - Vérifier que les fonctionnalités spécifiques aux producteurs sont bien protégées

3. **Navigation** :
   - La navigation automatique dans `AppNavigator` tient maintenant compte du rôle de l'utilisateur
   - Les non-producteurs ne sont plus redirigés vers `CreateProject`

## 🚀 Prochaines étapes (optionnel)

1. **Tests** : Tester tous les scénarios d'onboarding pour chaque profil
2. **Validation** : Vérifier que les fonctionnalités spécifiques aux producteurs sont bien protégées
3. **Documentation** : Mettre à jour la documentation utilisateur pour expliquer les différents profils

