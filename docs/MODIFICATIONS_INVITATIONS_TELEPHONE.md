# Modifications : Support des invitations par Email OU Téléphone

## 📋 Résumé

Implémentation de la **Solution 1** : Support des invitations de collaboration par **Email OU Téléphone** (au moins un requis).

## ✅ Modifications effectuées

### 1. Base de données (Migration)

**Fichier** : `backend/database/migrations/066_make_email_optional_in_collaborations.sql`

- ✅ Rendu `email` nullable dans la table `collaborations`
- ✅ Ajout d'une contrainte `CHECK` : `email IS NOT NULL OR telephone IS NOT NULL`
- ✅ Création d'un index sur `telephone` pour améliorer les performances

```sql
ALTER TABLE collaborations ALTER COLUMN email DROP NOT NULL;
ALTER TABLE collaborations ADD CONSTRAINT check_email_or_telephone 
  CHECK (email IS NOT NULL OR telephone IS NOT NULL);
CREATE INDEX idx_collaborations_telephone ON collaborations(telephone) 
  WHERE telephone IS NOT NULL;
```

### 2. Backend - DTO

**Fichier** : `backend/src/collaborations/dto/create-collaborateur.dto.ts`

- ✅ `email` rendu optionnel avec validation conditionnelle
- ✅ `telephone` rendu optionnel avec validation conditionnelle
- ✅ Validation dans le service : au moins un des deux doit être fourni

### 3. Backend - Service

**Fichier** : `backend/src/collaborations/collaborations.service.ts`

#### `create()` :
- ✅ Validation : vérifie qu'au moins `email` OU `telephone` est fourni
- ✅ Accepte `email = null` si `telephone` est fourni

#### `findInvitationsEnAttente()` :
- ✅ Recherche par `user_id` OU `email` OU `telephone`
- ✅ Liaison automatique améliorée : lie les invitations par email OU téléphone
- ✅ Support de la recherche simultanée par email ET téléphone

#### `accepterInvitation()` et `rejeterInvitation()` :
- ✅ Vérification améliorée : accepte les invitations par `user_id` OU `email` OU `telephone`
- ✅ Récupère l'email ET le téléphone de l'utilisateur connecté pour la vérification

### 4. Backend - Contrôleur

**Fichier** : `backend/src/collaborations/collaborations.controller.ts`

- ✅ Endpoint `GET /collaborations/invitations` accepte maintenant `?telephone=...`
- ✅ Paramètre `telephone` ajouté à la documentation Swagger

### 5. Frontend - Redux Slice

**Fichier** : `src/store/slices/collaborationSlice.ts`

- ✅ `loadInvitationsEnAttente` accepte maintenant `telephone` en paramètre
- ✅ Envoie `email` ET `telephone` dans la requête API

### 6. Frontend - Formulaire

**Fichier** : `src/components/CollaborationFormModal.tsx`

- ✅ Labels modifiés : "Contact (Email ou Téléphone requis) *"
- ✅ Indication claire que l'un ou l'autre est suffisant
- ✅ Placeholders mis à jour pour clarifier l'optionnalité

### 7. Frontend - Validation

**Fichier** : `src/validation/collaborationSchemas.ts`

- ✅ Schéma Yup avec validation conditionnelle :
  - Si `telephone` vide → `email` devient obligatoire
  - Si `email` vide → `telephone` devient obligatoire
  - Au moins un des deux doit être rempli

### 8. Frontend - Utilisation

**Fichiers modifiés** :
- `src/components/InvitationsModal.tsx` : Tous les appels à `loadInvitationsEnAttente` incluent maintenant `telephone`
- `src/navigation/AppNavigator.tsx` : Inclut `telephone` lors du chargement des invitations

## 🔄 Flux mis à jour

### Création d'invitation

```
1. Propriétaire remplit le formulaire :
   - Nom, Prénom (obligatoires)
   - Email OU Téléphone (au moins un requis)
   - Rôle, Permissions

2. Backend valide :
   - Vérifie qu'au moins email OU telephone est fourni
   - Crée l'invitation avec email (peut être NULL) et telephone

3. Invitation créée avec statut 'en_attente'
```

### Récupération d'invitations

```
1. Utilisateur se connecte avec email OU téléphone

2. Frontend appelle :
   GET /collaborations/invitations?email=...&telephone=...

3. Backend recherche :
   - Invitations avec user_id = userId OU
   - Invitations avec email = userEmail OU
   - Invitations avec telephone = userTelephone

4. Liaison automatique :
   - Si invitation trouvée par email/téléphone et user_id = NULL
   - → Met à jour user_id automatiquement

5. Retourne toutes les invitations correspondantes
```

### Acceptation/Rejet

```
1. Utilisateur clique sur "Accepter" ou "Rejeter"

2. Backend vérifie que l'invitation :
   - Existe (id valide)
   - Appartient à l'utilisateur (par user_id OU email OU telephone)
   - Est toujours en statut 'en_attente'

3. Si OK :
   - Change statut → 'actif' ou 'inactif'
   - Lie définitivement user_id si ce n'était pas déjà fait
```

## 🧪 Scénarios de test

### ✅ Cas 1 : Invitation par email uniquement
1. Propriétaire invite `jean@example.com`
2. Jean crée un compte avec cet email
3. **Résultat attendu** : Jean voit l'invitation

### ✅ Cas 2 : Invitation par téléphone uniquement
1. Propriétaire invite `+225 07 12 34 56 78`
2. Jean crée un compte avec ce numéro
3. **Résultat attendu** : Jean voit l'invitation

### ✅ Cas 3 : Invitation par email + compte par téléphone
1. Propriétaire invite `jean@example.com`
2. Jean crée un compte avec téléphone ET ajoute cet email à son profil
3. **Résultat attendu** : Jean voit l'invitation (liaison par email)

### ✅ Cas 4 : Invitation par téléphone + compte par email
1. Propriétaire invite `+225 07 12 34 56 78`
2. Jean crée un compte avec email ET ajoute ce téléphone à son profil
3. **Résultat attendu** : Jean voit l'invitation (liaison par téléphone)

### ✅ Cas 5 : Invitation avec email ET téléphone
1. Propriétaire invite avec `jean@example.com` ET `+225 07 12 34 56 78`
2. Jean se connecte avec l'un ou l'autre
3. **Résultat attendu** : Jean voit l'invitation (liaison par les deux)

## ⚠️ Points d'attention

1. **Migration à exécuter** : La migration `066_make_email_optional_in_collaborations.sql` doit être appliquée sur la base de données de production

2. **Données existantes** : Les invitations existantes avec `email` non-null continueront de fonctionner normalement

3. **Validation** : La validation backend et frontend garantit qu'au moins un identifiant est fourni

4. **Performance** : L'index sur `telephone` améliore les performances de recherche

## 📝 Notes techniques

- La contrainte `CHECK` au niveau base de données garantit l'intégrité des données
- La validation au niveau application (DTO + service) fournit des messages d'erreur clairs
- La recherche est optimisée avec des index sur `email` et `telephone`
- La liaison automatique fonctionne pour email ET téléphone

## 🚀 Prochaines étapes (optionnel)

1. **Notifications** : Envoyer des SMS pour les invitations par téléphone
2. **Validation téléphone** : Ajouter validation du format international
3. **Déduplication** : Vérifier qu'un même email/téléphone n'est pas invité deux fois pour le même projet

