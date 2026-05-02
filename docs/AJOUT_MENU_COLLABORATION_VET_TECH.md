# Ajout du menu Collaboration pour profils Vétérinaire et Technicien

## Objectif
Permettre aux profils vétérinaire et technicien d'accéder à leur code QR personnel via un onglet "Collaboration" dans la barre de menu.

## Contexte et logique métier
- **Seul le profil producteur** peut scanner des codes QR et envoyer des invitations de collaboration
- Les profils vétérinaire, technicien et acheteur peuvent **uniquement afficher leur code QR** pour être ajoutés par un producteur
- Si un vétérinaire/technicien/acheteur veut scanner un code QR ou inviter quelqu'un, il doit créer un profil producteur
- Le code QR permet au producteur de scanner et d'ajouter le vétérinaire/technicien à son projet actif
- **IMPORTANT : Chaque profil a son propre code QR unique** - Si un utilisateur a plusieurs profils (ex: producteur ET vétérinaire), chaque profil génère un code QR différent basé sur le `profileId` et non sur le `userId`. Cela garantit qu'un producteur ajoute le bon profil avec les bonnes permissions.

## Modifications apportées

### 1. Base de données

#### Migration `085_add_profile_id_to_collaborations.sql`
- Ajoute la colonne `profile_id` dans la table `collaborations`
- Crée un index sur `profile_id` pour améliorer les performances
- Permet de différencier les profils d'un même utilisateur

### 2. Backend

#### `backend/src/common/services/qrcode.service.ts`
- **Nouvelle méthode `generateProfileQRCode(profileId, profileType, expiryMinutes)`** : Génère un QR code basé sur `profileId` (format: `profile_${userId}_${role}`)
- **Nouvelle méthode `decodeProfileQRData(qrData)`** : Décode un QR code de profil et retourne `profileId`, `profileType` et `exp`
- **Interface `QRData` modifiée** : Supporte maintenant deux types :
  - `type: 'collab'` avec `uid` (ancien format basé sur userId)
  - `type: 'profile'` avec `pid` et `profileType` (nouveau format basé sur profileId)

#### `backend/src/collaborations/collaborations.controller.ts`
- **Nouveau endpoint `GET /collaborations/qr-code/profile`** :
  - Accessible uniquement aux profils vétérinaire et technicien
  - Génère un QR code basé sur `profileId` du profil actif
  - Retourne : `qr_code`, `expires_in`, `profileId`, `profileType`, `profileName`
  
- **Endpoint `POST /collaborations/validate-qr` modifié** :
  - Supporte maintenant les deux types de QR codes (userId et profileId)
  - Détecte automatiquement le type de QR code
  - Vérifie que les QR codes de profil sont bien vétérinaire ou technicien
  - Retourne `profileId` et `profileType` si c'est un QR code de profil
  
- **Endpoint `POST /collaborations/from-qr` modifié** :
  - Accepte maintenant `profile_id` et `profile_type` en plus de `scanned_user_id`
  - Stocke `profile_id` dans la collaboration lors de la création

#### `backend/src/collaborations/collaborations.service.ts`
- **Méthode `createFromQRScan()` modifiée** :
  - Accepte `profileId` et `profileType` en paramètres optionnels
  - Valide que le `profileId` correspond bien au `scannedUserId`
  - Vérifie les doublons par `profileId` si fourni
  - Stocke `profile_id` dans la base de données lors de l'insertion

### 3. Frontend

#### `src/screens/Collaborations/CollaborationVetTechScreen.tsx` (NOUVEAU)
- Écran dédié pour afficher le QR code de profil pour vétérinaire/technicien
- Utilise l'endpoint `/collaborations/qr-code/profile`
- Affiche le type de profil (Vétérinaire ou Technicien)
- Se recharge automatiquement quand le profil actif change (via `useEffect` avec `activeRole` en dépendance)
- Messages explicatifs adaptés au profil
- Fonctionnalités : partage, régénération, timer d'expiration

#### `src/navigation/LazyScreens.tsx`
- Ajout de l'export `CollaborationVetTechScreen`

#### `src/navigation/types.ts`
- Ajout de `COLLABORATION_VET_TECH: 'CollaborationVetTech'`

#### `src/navigation/AppNavigator.tsx`
- Ajout de l'onglet "Collaboration" dans la barre de navigation pour vétérinaire/technicien
- Visible uniquement si `activeRole === 'veterinarian' || activeRole === 'technician'`
- Icône : 👥
- Label : "Collaboration"

## Format du profileId

Le `profileId` est généré selon le format : `profile_${userId}_${activeRole}`

Exemples :
- `profile_user123_veterinarian`
- `profile_user456_technician`

## Flux de collaboration

### Pour un vétérinaire/technicien :
1. L'utilisateur sélectionne son profil vétérinaire ou technicien comme profil actif
2. L'onglet "Collaboration" apparaît dans la barre de navigation
3. L'utilisateur ouvre l'onglet et voit son QR code unique basé sur `profileId`
4. Le QR code change automatiquement si l'utilisateur change de profil actif
5. Le producteur scanne le QR code
6. Le backend décode le `profileId` et vérifie que c'est un profil vétérinaire/technicien
7. Le producteur confirme l'ajout
8. La collaboration est créée avec `profile_id` stocké dans la base de données

### Pour un producteur :
1. Le producteur ouvre l'écran Collaborations (via Dashboard)
2. Il peut scanner un QR code (ancien format userId ou nouveau format profileId)
3. Le backend détecte automatiquement le type de QR code
4. Si c'est un QR code de profil, le `profileId` est stocké dans la collaboration

## Sécurité

- ✅ Seuls les profils vétérinaire et technicien peuvent générer un QR code de profil
- ✅ Le `profileId` est chiffré dans le QR code
- ✅ Le QR code expire après 5 minutes (configurable)
- ✅ Protection anti-replay (nonce unique)
- ✅ Vérification que le `profileId` correspond bien au `userId` lors du scan
- ✅ Vérification que le profil scanné est bien vétérinaire ou technicien

## Tests à effectuer

1. **Test 1 : Affichage du code QR pour vétérinaire**
   - Se connecter avec un utilisateur ayant un profil vétérinaire
   - Sélectionner le profil vétérinaire comme profil actif
   - Naviguer vers l'onglet "Collaboration"
   - Vérifier que le QR code s'affiche
   - Vérifier que le QR code contient le `profileId` du profil vétérinaire
   - Vérifier que le type de profil "Vétérinaire" est affiché

2. **Test 2 : Code QR différent selon le profil actif**
   - Se connecter avec un utilisateur ayant 2 profils : vétérinaire ET technicien
   - Sélectionner le profil vétérinaire, noter le code QR généré
   - Changer pour le profil technicien
   - Vérifier que le QR code a changé et contient le `profileId` du technicien
   - Vérifier que le type affiché est maintenant "Technicien"

3. **Test 3 : Scan réussi par un producteur - profil spécifique ajouté**
   - Créer un utilisateur avec 2 profils : producteur ET vétérinaire
   - Créer un autre utilisateur avec un profil technicien
   - Se connecter avec le producteur (profil actif = producteur)
   - Scanner le QR code du profil technicien
   - Vérifier que c'est le `profileId` du technicien qui est ajouté au projet
   - Vérifier dans la BDD que `collaborations.profile_id` correspond au profil technicien
   - Vérifier que si l'utilisateur a aussi un profil producteur, ce n'est PAS ce profil qui est ajouté

4. **Test 4 : Rejet de scan de profil incompatible**
   - Créer un producteur
   - Créer un utilisateur avec un profil producteur (pas vétérinaire)
   - Tenter de scanner le QR code du profil producteur
   - Vérifier qu'une erreur est retournée (type de profil incompatible)

5. **Test 5 : Absence d'onglet Collaboration pour acheteur**
   - Se connecter avec un profil acheteur
   - Vérifier que l'onglet "Collaboration" n'existe PAS

6. **Test 6 : Protection contre usurpation de profileId**
   - Tenter d'accéder à `GET /collaborations/qr-code/profile` avec un profil producteur
   - Vérifier qu'une erreur 403 est retournée
   - Vérifier que seul le propriétaire du profil peut générer son code QR

## Fichiers modifiés

### Backend
- `backend/database/migrations/085_add_profile_id_to_collaborations.sql` (NOUVEAU)
- `backend/src/common/services/qrcode.service.ts`
- `backend/src/collaborations/collaborations.controller.ts`
- `backend/src/collaborations/collaborations.service.ts`

### Frontend
- `src/screens/Collaborations/CollaborationVetTechScreen.tsx` (NOUVEAU)
- `src/navigation/LazyScreens.tsx`
- `src/navigation/types.ts`
- `src/navigation/AppNavigator.tsx`

## Notes importantes

- Le QR code se régénère automatiquement quand l'utilisateur change de profil actif (via `useEffect` avec `activeRole` en dépendance)
- L'onglet "Collaboration" n'apparaît que pour les profils vétérinaire et technicien
- Pour les producteurs, l'écran Collaborations reste accessible via le Dashboard (onglet caché)
- Les QR codes basés sur `userId` (ancien format) continuent de fonctionner pour la rétrocompatibilité
- Les QR codes de profil expirent après 5 minutes par défaut (configurable via query param `expiry`)
