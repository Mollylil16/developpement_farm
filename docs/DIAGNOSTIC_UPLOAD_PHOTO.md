# 🔍 Guide de Diagnostic : Erreur "Network request failed" lors de l'Upload de Photo

**Date**: 2025-01-XX  
**Problème**: L'upload de photo échoue avec l'erreur "Network request failed"

---

## 📋 Symptômes

- ✅ Le FormData est créé correctement
- ✅ Le token d'authentification est récupéré
- ✅ La requête est envoyée vers `http://172.20.10.2:3000/users/:id/photo`
- ❌ Erreur : "Network request failed"

---

## 🔍 Causes Possibles

### 1. **Backend Non Démarré** ⚠️
**Symptôme**: L'erreur se produit immédiatement  
**Solution**: 
```bash
cd backend
npm run start:dev
# Vérifier que le backend démarre sur le port 3000
```

### 2. **Backend Non Accessible à l'Adresse IP** ⚠️
**Symptôme**: L'erreur se produit immédiatement  
**Vérification**:
```bash
# Sur votre machine (où le backend tourne)
# Windows
ipconfig
# Mac/Linux
ifconfig

# Vérifier que l'IP 172.20.10.2 correspond bien à votre machine
```

**Solution**:
- Vérifier que le backend écoute sur `0.0.0.0:3000` (pas seulement `localhost:3000`)
- Vérifier que l'appareil mobile est sur le même réseau WiFi
- Mettre à jour `API_BASE_URL` dans l'app si nécessaire

### 3. **CORS Non Configuré** ⚠️
**Symptôme**: L'erreur se produit, mais le backend reçoit la requête (vérifier les logs backend)  
**Vérification**: Vérifier les logs du backend pour voir si la requête arrive

**Solution**: 
Le backend doit autoriser les requêtes depuis l'app React Native. Vérifier `backend/src/main.ts`:
```typescript
app.enableCors({
  origin: (origin, callback) => {
    // En développement, autoriser toutes les origines
    callback(null, !isProduction);
  },
  // ...
});
```

### 4. **Firewall Bloque la Connexion** ⚠️
**Symptôme**: L'erreur se produit immédiatement  
**Solution**:
- Désactiver temporairement le firewall Windows/Mac
- Autoriser le port 3000 dans les règles du firewall
- Vérifier que l'antivirus ne bloque pas la connexion

### 5. **Problème avec FormData dans React Native** ⚠️
**Symptôme**: L'erreur se produit uniquement pour les uploads, pas pour les autres requêtes  
**Vérification**: Tester une requête GET simple vers le backend

**Solution**: 
Le code actuel retire correctement le `Content-Type` pour FormData. Vérifier que :
- Le FormData est créé correctement (voir logs)
- Le backend accepte `multipart/form-data` (vérifier avec Multer)

### 6. **Timeout Trop Court** ⚠️
**Symptôme**: L'erreur se produit après quelques secondes  
**Solution**: 
Le timeout est déjà configuré à 60 secondes pour les uploads. Si le problème persiste, augmenter le timeout dans `UserRepository.ts`:
```typescript
timeout: 120000, // 120 secondes
```

---

## 🛠️ Étapes de Diagnostic

### Étape 1 : Vérifier que le Backend est Démarré
```bash
# Terminal 1 : Backend
cd backend
npm run start:dev

# Vérifier les logs pour confirmer :
# "Application is running on: http://0.0.0.0:3000"
```

### Étape 2 : Tester la Connexion depuis l'Appareil
```bash
# Sur l'appareil mobile ou l'émulateur
# Tester une requête simple (GET) vers le backend
curl http://172.20.10.2:3000/health
# ou depuis l'app, tester un endpoint simple
```

### Étape 3 : Vérifier les Logs Backend
Si le backend reçoit la requête, vérifier les logs pour voir l'erreur exacte :
```bash
# Les logs backend devraient afficher :
# - La requête reçue
# - L'erreur éventuelle (validation, authentification, etc.)
```

### Étape 4 : Tester avec Postman/curl
```bash
# Tester l'endpoint directement avec curl
curl -X POST http://172.20.10.2:3000/users/:id/photo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@/path/to/image.jpg"

# Si ça fonctionne avec curl mais pas avec l'app, le problème vient de l'app
```

### Étape 5 : Vérifier la Configuration Réseau
- **Appareil physique**: Vérifier que l'appareil est sur le même réseau WiFi que la machine du backend
- **Émulateur Android**: Utiliser `10.0.2.2` au lieu de l'IP locale
- **Simulateur iOS**: Utiliser `localhost` ou l'IP locale

---

## 🔧 Solutions Spécifiques

### Solution 1 : Configurer l'IP Correcte
Si l'IP `172.20.10.2` n'est pas correcte :

1. Trouver votre IP locale :
```bash
# Windows
ipconfig | findstr IPv4

# Mac/Linux
ifconfig | grep "inet "
```

2. Mettre à jour l'URL dans l'app :
```typescript
// Dans src/config/env.ts ou via AsyncStorage
await AsyncStorage.setItem('@fermier_pro:api_url', 'http://VOTRE_IP:3000');
```

### Solution 2 : Forcer le Backend à Écouter sur Toutes les Interfaces
Vérifier que le backend écoute sur `0.0.0.0` et non seulement `localhost`:
```typescript
// Dans backend/src/main.ts
await app.listen(3000, '0.0.0.0');
```

### Solution 3 : Désactiver Temporairement le Firewall
Pour tester si le firewall bloque la connexion :
- **Windows**: Désactiver temporairement le Firewall Windows
- **Mac**: Désactiver temporairement le Firewall dans Préférences Système
- **Linux**: `sudo ufw disable` (temporairement)

### Solution 4 : Utiliser un Tunnel (ngrok)
Si le problème persiste, utiliser ngrok pour créer un tunnel :
```bash
# Installer ngrok
npm install -g ngrok

# Créer un tunnel vers le backend
ngrok http 3000

# Utiliser l'URL ngrok dans l'app
# Ex: https://abc123.ngrok.io
```

---

## 📊 Logs à Vérifier

### Logs Frontend (React Native)
```
LOG  [UserRepository.uploadPhoto] FormData créé: {...}
LOG  [UserRepository.uploadPhoto] Début upload pour userId=...
LOG  [apiClient] [DEBUG] [executeHttpRequest] Envoi FormData vers /users/.../photo
ERROR [apiClient] [ERROR] [executeHttpRequest] Erreur réseau pour /users/.../photo: Network request failed
```

### Logs Backend (NestJS)
Si le backend reçoit la requête, vous devriez voir :
```
[Nest] POST /users/:id/photo
[ProfilePhotoInterceptor] File received: ...
```

Si vous ne voyez **aucun log backend**, le problème est que la requête n'atteint pas le backend.

---

## ✅ Checklist de Vérification

- [ ] Backend démarré et accessible sur `http://172.20.10.2:3000`
- [ ] Appareil mobile sur le même réseau WiFi
- [ ] Firewall ne bloque pas le port 3000
- [ ] CORS configuré correctement dans le backend
- [ ] IP correcte dans la configuration de l'app
- [ ] Backend écoute sur `0.0.0.0:3000` (pas seulement `localhost`)
- [ ] Test avec curl/Postman fonctionne
- [ ] Logs backend montrent la requête reçue (ou pas)

---

## 🚨 Si Rien Ne Fonctionne

1. **Utiliser ngrok** pour créer un tunnel HTTPS vers le backend
2. **Tester avec un appareil physique** au lieu d'un émulateur
3. **Vérifier les logs complets** (frontend + backend) pour identifier l'erreur exacte
4. **Tester avec une requête GET simple** pour isoler le problème FormData

---

**Note**: L'erreur "Network request failed" est générique et peut avoir plusieurs causes. Suivez les étapes de diagnostic dans l'ordre pour identifier la cause exacte.
