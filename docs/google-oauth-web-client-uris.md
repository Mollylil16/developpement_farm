# Configuration Google OAuth Web Client ID - URIs

## 📋 URIs à ajouter dans Google Cloud Console

### Origines JavaScript autorisées

Ces domaines peuvent initier le flux OAuth Google :

#### Développement local
```
http://localhost:3000
http://localhost:5173
http://localhost:19006
http://127.0.0.1:3000
http://127.0.0.1:5173
http://127.0.0.1:19006
```

#### Production (Render)
```
https://fermier-pro-backend.onrender.com
```

---

### URI de redirection autorisées

Ces URIs sont les endpoints où Google redirige après l'authentification :

#### Développement local
```
http://localhost:3000/auth/google/callback
http://localhost:5173/auth/google/callback
http://localhost:19006/auth/google/callback
http://127.0.0.1:3000/auth/google/callback
http://127.0.0.1:5173/auth/google/callback
http://127.0.0.1:19006/auth/google/callback
```

#### Production (Render)
```
https://fermier-pro-backend.onrender.com/auth/google/callback
```

---

## 📝 Format pour copier-coller dans Google Cloud Console

### Origines JavaScript autorisées :
```
http://localhost:3000
http://localhost:5173
http://localhost:19006
http://127.0.0.1:3000
http://127.0.0.1:5173
http://127.0.0.1:19006
https://fermier-pro-backend.onrender.com
```

### URI de redirection autorisées :
```
http://localhost:3000/auth/google/callback
http://localhost:5173/auth/google/callback
http://localhost:19006/auth/google/callback
http://127.0.0.1:3000/auth/google/callback
http://127.0.0.1:5173/auth/google/callback
http://127.0.0.1:19006/auth/google/callback
https://fermier-pro-backend.onrender.com/auth/google/callback
```

---

## 🔍 Explication des ports

- **Port 3000** : Backend NestJS (développement local)
- **Port 5173** : Admin Web Vite (développement local)
- **Port 19006** : Expo Web (développement local, port par défaut)
- **Render** : Backend en production

---

## ⚠️ Notes importantes

1. **Pour le mobile** : Les applications React Native utilisent un **scheme personnalisé** (`fermierpro://oauth/google`) qui ne nécessite PAS de Web Client ID. Le Web Client ID est uniquement pour les interfaces web.

2. **Sécurité** : 
   - Ne partagez jamais votre Client ID ou Client Secret
   - Utilisez HTTPS en production
   - Limitez les origines JavaScript aux domaines que vous contrôlez

3. **Backend OAuth** : Le backend actuel (`/auth/google`) reçoit un `id_token` directement, donc il n'utilise pas de callback web classique. Ces URIs sont pour une éventuelle interface web qui utiliserait OAuth directement.

4. **Si vous n'avez pas d'interface web** : Vous pouvez simplifier en n'ajoutant que les URIs de production si nécessaire.

---

## 🚀 Prochaines étapes

1. Copiez les URIs ci-dessus dans Google Cloud Console
2. Sauvegardez la configuration
3. Copiez le **Web Client ID** généré
4. Ajoutez-le dans vos variables d'environnement :
   ```env
   GOOGLE_CLIENT_ID_WEB=votre-web-client-id.apps.googleusercontent.com
   ```
5. Mettez à jour le backend pour accepter ce Client ID dans la liste des audiences valides
