# Compléments - Ajout du menu Collaboration pour profils Vétérinaire et Technicien

## Modifications supplémentaires effectuées

### 1. Types TypeScript mis à jour

#### `src/types/collaboration.ts`
- Ajout de `profile_id?: string` dans l'interface `Collaborateur`
- Permet au frontend de recevoir et afficher le `profile_id` lors de la récupération des collaborations

#### `src/screens/Collaborations/ScanQRCollaborateurScreen.tsx`
- Mise à jour de l'interface `ScannedUser` pour inclure :
  - `profileId?: string`
  - `profileType?: 'veterinarian' | 'technician'`
- Modification de `handleAddCollaborator()` pour passer `profileId` et `profileType` à l'endpoint `/collaborations/from-qr` si présents

### 2. Backend - Types et mapping mis à jour

#### `backend/src/collaborations/collaborations.service.ts`
- Ajout de `profile_id?: string | null` dans l'interface `CollaborationRow`
- Mise à jour de `mapRowToCollaborateur()` pour inclure `profile_id` dans le retour
- Les requêtes SELECT incluent automatiquement `profile_id` grâce à `SELECT * FROM collaborations`

## Migration automatique

La migration `085_add_profile_id_to_collaborations.sql` sera appliquée automatiquement au prochain démarrage du backend grâce au système de migration automatique (`MigrationService`).

### Vérification de l'application de la migration

Pour vérifier que la migration a été appliquée :

```sql
-- Vérifier que la colonne profile_id existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'collaborations' AND column_name = 'profile_id';

-- Vérifier que l'index existe
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'collaborations' AND indexname = 'idx_collaborations_profile_id';

-- Vérifier que la migration est enregistrée
SELECT migration_number, migration_name, applied_at 
FROM schema_migrations 
WHERE migration_name = '085_add_profile_id_to_collaborations.sql';
```

## Flux complet de collaboration avec profileId

### Scénario : Ajout d'un vétérinaire via QR code

1. **Vétérinaire** :
   - Sélectionne son profil vétérinaire comme profil actif
   - Ouvre l'onglet "Collaboration"
   - Son QR code unique est généré (basé sur `profile_user123_veterinarian`)
   - Partage son QR code avec un producteur

2. **Producteur** :
   - Ouvre l'écran Collaborations (via Dashboard)
   - Appuie sur "Scanner un code QR"
   - Scanne le QR code du vétérinaire
   - Le backend décode le QR code et détecte que c'est un QR code de profil :
     - `profileId`: `profile_user123_veterinarian`
     - `profileType`: `veterinarian`
   - Le producteur confirme l'ajout avec le rôle approprié (vétérinaire)

3. **Backend** :
   - Valide que le `profileId` correspond au `userId` scanné
   - Vérifie que le profil est bien vétérinaire ou technicien
   - Vérifie qu'il n'y a pas déjà de collaboration avec ce `profileId` sur ce projet
   - Crée la collaboration avec :
     - `user_id`: `user123` (pour référence)
     - `profile_id`: `profile_user123_veterinarian` (pour identifier le profil spécifique)
     - `role`: `veterinaire`
     - `statut`: `actif` (directement actif, pas d'attente)

4. **Résultat** :
   - Le vétérinaire apparaît dans la liste des collaborateurs du projet
   - Il reçoit une notification
   - Il peut accepter ou refuser l'invitation (même si déjà actif, il peut refuser pour se retirer)

## Différences entre QR codes userId et profileId

### QR Code basé sur userId (ancien format)
- Format du QR code : `{ type: 'collab', uid: encrypted_userId, ... }`
- Utilisé pour : Tous les utilisateurs (général)
- Identifiant stocké : Seulement `user_id` dans la collaboration
- Cas d'usage : Utilisateur avec un seul profil ou profil producteur

### QR Code basé sur profileId (nouveau format)
- Format du QR code : `{ type: 'profile', pid: encrypted_profileId, profileType: 'veterinarian'|'technician', ... }`
- Utilisé pour : Profils vétérinaire et technicien uniquement
- Identifiant stocké : `user_id` + `profile_id` dans la collaboration
- Cas d'usage : Utilisateur avec plusieurs profils (ex: producteur ET vétérinaire)

## Avantages du système profileId

1. **Différenciation des profils** : Un utilisateur peut avoir plusieurs profils (producteur + vétérinaire), et chaque profil a son propre QR code
2. **Permissions précises** : Le producteur ajoute le bon profil avec les bonnes permissions
3. **Traçabilité** : On sait exactement quel profil a été ajouté (et non juste quel utilisateur)
4. **Sécurité** : Seuls les profils vétérinaire et technicien peuvent générer un QR code de profil

## Tests à effectuer (suite)

### Test 7 : Vérification de la migration
- [ ] Démarrer le backend et vérifier que la migration 085 est appliquée automatiquement
- [ ] Vérifier que la colonne `profile_id` existe dans la table `collaborations`
- [ ] Vérifier que l'index `idx_collaborations_profile_id` existe

### Test 8 : Vérification du type TypeScript
- [ ] Vérifier que le type `Collaborateur` inclut `profile_id` dans le frontend
- [ ] Vérifier que `ScannedUser` inclut `profileId` et `profileType`

### Test 9 : End-to-end avec profil spécifique
- [ ] Créer un utilisateur avec 2 profils : producteur ET vétérinaire
- [ ] Se connecter avec le profil vétérinaire
- [ ] Générer un QR code de profil vétérinaire
- [ ] Se connecter avec un autre utilisateur (producteur)
- [ ] Scanner le QR code du vétérinaire
- [ ] Vérifier que la collaboration est créée avec le `profile_id` du vétérinaire
- [ ] Vérifier que si le même utilisateur a un profil producteur, ce n'est PAS ce profil qui est ajouté

## Fichiers modifiés (complément)

- `src/types/collaboration.ts` - Ajout de `profile_id` dans `Collaborateur`
- `src/screens/Collaborations/ScanQRCollaborateurScreen.tsx` - Support de `profileId` et `profileType`
- `backend/src/collaborations/collaborations.service.ts` - Ajout de `profile_id` dans `CollaborationRow` et mapping

## Prochaines actions

1. ✅ Migration créée et prête à être appliquée automatiquement
2. ✅ Types TypeScript mis à jour
3. ✅ Frontend mis à jour pour gérer `profileId`
4. ✅ Backend mis à jour pour mapper `profile_id`
5. ⏳ Tester l'application complète après déploiement
