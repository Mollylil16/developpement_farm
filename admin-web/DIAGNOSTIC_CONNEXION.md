# 🔍 Guide de Diagnostic - Connexion Frontend-Backend

## ✅ Checklist de Vérification

### 1. Vérifier que le Backend est Lancé

**Dans le terminal backend :**
- Vous devriez voir : `[Nest] ... LOG [Bootstrap] Backend API démarré sur http://0.0.0.0:3000`
- Si ce n'est pas le cas, lancez : `cd backend && npm run start:dev`

---

### 2. Tester l'Endpoint Backend Directement

**Dans PowerShell (dans le dossier backend) :**
```powershell
Invoke-WebRequest -Method POST -Uri http://localhost:3000/admin/auth/login -ContentType "application/json" -Body '{"email":"admin1@farmtrack.com","password":"Admin123!@#"}'
```

**Résultats possibles :**
- ✅ **200 OK** : Le backend fonctionne, les comptes existent
- ❌ **401 Unauthorized** : Les comptes n'existent pas → Exécutez `npm run setup:admin`
- ❌ **ERR_NETWORK ou ECONNREFUSED** : Le backend n'est pas lancé ou écoute sur un autre port

---

### 3. Vérifier la Console du Navigateur (CRITIQUE)

**Ouvrez la console du navigateur (F12) et regardez :**

1. **Lors du chargement de la page de login**, vous devriez voir :
   ```
   🔧 Configuration API: { API_BASE_URL: 'http://localhost:3000', VITE_API_URL: undefined }
   ```

2. **Lors de la tentative de connexion**, vous devriez voir :
   ```
   🔐 Début de la connexion...
   🔗 Tentative de connexion à: http://localhost:3000/admin/auth/login
   📡 API_BASE_URL: http://localhost:3000
   ```

3. **Erreurs possibles :**
   - `ERR_NETWORK` ou `ECONNREFUSED` → Le backend n'est pas accessible
   - `CORS policy` → Problème de CORS
   - `401 Unauthorized` → Identifiants incorrects ou comptes inexistants
   - `404 Not Found` → L'endpoint n'existe pas
   - `Timeout` → Le backend ne répond pas assez vite

---

### 4. Vérifier le Fichier .env du Frontend

**Vérifiez qu'il n'y a pas de fichier `.env` dans `admin-web/` qui surcharge `API_BASE_URL` :**

Si un fichier `.env` existe dans `admin-web/`, il devrait contenir :
```env
VITE_API_URL=http://localhost:3000
```

**Important :** Si vous modifiez `.env`, redémarrez le serveur de développement (`npm run dev`).

---

### 5. Vérifier que le Frontend est Lancé

**Dans le terminal frontend :**
- Vous devriez voir : `Local: http://localhost:5173/`
- Si ce n'est pas le cas, lancez : `cd admin-web && npm run dev`

---

### 6. Vérifier les Logs du Backend lors de la Connexion

**Quand vous essayez de vous connecter depuis le frontend, vous devriez voir dans les logs backend :**

```
[AuthLoggingInterceptor] [AuthLog] {"endpoint":"/admin/auth/login","method":"POST",...}
```

**Si vous ne voyez PAS ces logs :**
- Le frontend n'arrive pas à joindre le backend (problème réseau)
- Vérifiez le firewall Windows
- Vérifiez que le backend écoute bien sur `localhost:3000`

---

### 7. Tester avec l'URL Complète dans le Navigateur

**Ouvrez dans votre navigateur :**
```
http://localhost:3000/api/docs
```

**Résultat attendu :** Swagger UI devrait s'afficher

**Si ça ne fonctionne pas :** Le backend n'est pas accessible depuis le navigateur

---

### 8. Vérifier CORS

**Dans `backend/src/main.ts`, vérifiez que `localhost:5173` est dans les origines autorisées :**

```typescript
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];
```

**Si `NODE_ENV=production` dans `.env`**, CORS peut être plus strict. Pour le dev local, changez temporairement :
```env
NODE_ENV=development
```

---

## 🐛 Solutions aux Problèmes Courants

### Problème : "ERR_NETWORK" ou "ECONNREFUSED"

**Solutions :**
1. Vérifiez que le backend est bien lancé sur le port 3000
2. Vérifiez le firewall Windows (autorisez Node.js)
3. Vérifiez qu'aucun autre processus n'utilise le port 3000 :
   ```powershell
   netstat -ano | findstr :3000
   ```

### Problème : "401 Unauthorized"

**Solutions :**
1. Vérifiez que les comptes admin existent : `cd backend && npm run setup:admin`
2. Vérifiez que le backend utilise la bonne base de données (base locale, pas Render)
3. Vérifiez que `DATABASE_URL` est commenté dans `backend/.env` pour le dev local

### Problème : "CORS policy"

**Solutions :**
1. Vérifiez que `localhost:5173` est dans les origines autorisées (voir point 8)
2. Changez temporairement `NODE_ENV=development` dans `backend/.env`
3. Redémarrez le backend après modification du `.env`

### Problème : Aucune Erreur Visible

**Solutions :**
1. Ouvrez la console du navigateur (F12) → Onglet "Console"
2. Vérifiez les logs avec les emojis (🔧, 🔗, ❌, etc.)
3. Ouvrez l'onglet "Network" dans la console pour voir les requêtes HTTP
4. Vérifiez que les requêtes vers `/admin/auth/login` sont bien envoyées

---

## 📋 Checklist Rapide

- [ ] Backend lancé sur `http://localhost:3000`
- [ ] Frontend lancé sur `http://localhost:5173`
- [ ] Comptes admin créés (`npm run setup:admin`)
- [ ] `DATABASE_URL` commenté dans `backend/.env` (pour dev local)
- [ ] `NODE_ENV=development` dans `backend/.env` (pour CORS plus permissif)
- [ ] Console du navigateur ouverte (F12) avec logs visibles
- [ ] Requête de test PowerShell fonctionne (point 2)
- [ ] Swagger accessible sur `http://localhost:3000/api/docs`

---

## 🔧 Commande de Test Rapide

**Pour tester rapidement si tout est correct :**

```powershell
# Test 1: Vérifier que le backend répond
Invoke-WebRequest -Uri http://localhost:3000/api/docs -UseBasicParsing

# Test 2: Tester la connexion admin
Invoke-WebRequest -Method POST -Uri http://localhost:3000/admin/auth/login -ContentType "application/json" -Body '{"email":"admin1@farmtrack.com","password":"Admin123!@#"}'
```

Si les deux commandes fonctionnent, le problème vient du frontend ou de CORS.
