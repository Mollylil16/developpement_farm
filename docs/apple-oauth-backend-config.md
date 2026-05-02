# Configuration Apple OAuth Backend - Fermier Pro

## ✅ Configuration terminée

Votre backend est maintenant configuré pour Apple Sign-In avec vos credentials Apple Developer.

---

## 📋 Variables d'environnement configurées

Les variables suivantes ont été ajoutées dans `backend/.env` :

```env
# Apple OAuth Configuration
APPLE_TEAM_ID=W9YDMQML3G
APPLE_SERVICE_ID=com.misterh225.fermierpro.signin
APPLE_KEY_ID=QQ595BRR73
APPLE_CLIENT_ID=com.misterh225.fermierpro
APPLE_BUNDLE_ID=com.misterh225.fermierpro
```

---

## 🔐 Configuration de la clé privée (.p8)

### Option 1 : Stocker le fichier .p8 (Recommandé pour développement local)

1. **Placez votre fichier .p8** dans `backend/config/apple-auth-key.p8`
2. **Décommentez** dans `.env` :
   ```env
   APPLE_PRIVATE_KEY_PATH=./config/apple-auth-key.p8
   ```

### Option 2 : Stocker le contenu dans .env (Recommandé pour production)

1. **Ouvrez votre fichier .p8** dans un éditeur de texte
2. **Copiez tout le contenu** (y compris les lignes `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----`)
3. **Remplacez tous les retours à la ligne par `\n`**
4. **Ajoutez dans `.env`** :
   ```env
   APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----"
   ```

**⚠️ IMPORTANT** : Ne commitez JAMAIS le fichier .p8 ou la clé privée dans le repository Git !

---

## 🔍 Utilisation des credentials

### Pour la vérification du token (actuel)

La méthode `loginWithApple()` utilise `apple-signin-auth` qui :
- ✅ Vérifie automatiquement le token avec les clés publiques Apple
- ✅ Ne nécessite PAS le fichier .p8 pour la vérification
- ✅ Utilise le Bundle ID ou Service ID comme audience

### Pour d'autres usages (futur)

Le fichier .p8 est nécessaire pour :
- Générer des tokens côté serveur
- Notifications push Apple
- Autres intégrations Apple nécessitant une signature

---

## 📝 Détails de la configuration

### Team ID
- **Valeur** : `W9YDMQML3G`
- **Usage** : Identifie votre équipe Apple Developer

### Service ID
- **Valeur** : `com.misterh225.fermierpro.signin`
- **Usage** : Identifiant du service Apple Sign-In (pour redirections web)

### Key ID
- **Valeur** : `QQ595BRR73`
- **Usage** : Identifie la clé privée (.p8) utilisée

### Bundle ID / Client ID
- **Valeur** : `com.misterh225.fermierpro`
- **Usage** : Identifie votre application iOS (utilisé comme audience pour les tokens)

---

## 🔧 Méthode `loginWithApple()` mise à jour

La méthode utilise maintenant :
1. **APPLE_CLIENT_ID** ou **APPLE_BUNDLE_ID** ou **APPLE_SERVICE_ID** comme audience
2. **Validation multiple** : Accepte le Bundle ID ou le Service ID comme audience valide
3. **Vérification de configuration** : Avertit si `APPLE_TEAM_ID` n'est pas configuré

---

## 🚀 Prochaines étapes

### 1. Ajouter le fichier .p8 (si nécessaire)

Si vous avez besoin de générer des tokens côté serveur :

```bash
# Placez votre fichier .p8 dans backend/config/
cp /chemin/vers/votre/fichier.p8 backend/config/apple-auth-key.p8
```

### 2. Configurer la clé privée dans .env

Choisissez l'option 1 ou 2 ci-dessus et décommentez la ligne correspondante dans `.env`.

### 3. Redémarrer le backend

```bash
cd backend
npm run start:dev
```

### 4. Tester l'authentification Apple

1. Ouvrez l'application iOS
2. Allez sur l'écran de connexion
3. Cliquez sur "Se connecter avec Apple"
4. Vérifiez que l'authentification fonctionne

---

## 🔒 Sécurité

### ✅ Bonnes pratiques

- ✅ Le fichier .p8 est dans `.gitignore`
- ✅ Les credentials sont dans `.env` (non commité)
- ✅ La vérification du token utilise les clés publiques Apple (sécurisé)

### ⚠️ À ne jamais faire

- ❌ Ne jamais commiter le fichier .p8
- ❌ Ne jamais exposer la clé privée dans le code
- ❌ Ne jamais partager les credentials Apple

---

## 🐛 Dépannage

### Erreur : "Token Apple généré pour une autre application"

**Cause** : L'audience du token ne correspond pas à vos identifiants configurés.

**Solution** :
1. Vérifiez que `APPLE_CLIENT_ID` ou `APPLE_BUNDLE_ID` correspond au Bundle ID de votre application
2. Vérifiez que le Service ID est correctement configuré dans Apple Developer Console
3. Vérifiez que l'App ID dans Apple Developer Console correspond à `com.misterh225.fermierpro`

### Erreur : "Token Apple invalide ou expiré"

**Cause** : Le token a expiré ou est invalide.

**Solution** :
1. Vérifiez que l'identity token est bien envoyé depuis le frontend
2. Vérifiez que le token n'a pas expiré (les tokens Apple expirent rapidement)
3. Vérifiez que l'application iOS utilise le bon Bundle ID

### Erreur : "APPLE_TEAM_ID non configuré"

**Cause** : La variable d'environnement `APPLE_TEAM_ID` n'est pas définie.

**Solution** :
1. Vérifiez que `APPLE_TEAM_ID=W9YDMQML3G` est dans votre `.env`
2. Redémarrez le backend après modification du `.env`

---

## 📚 Ressources

- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [apple-signin-auth npm package](https://www.npmjs.com/package/apple-signin-auth)
- [Apple Developer Console](https://developer.apple.com/account/)

---

**Date de création** : 2025-01-08  
**Dernière mise à jour** : 2025-01-08
