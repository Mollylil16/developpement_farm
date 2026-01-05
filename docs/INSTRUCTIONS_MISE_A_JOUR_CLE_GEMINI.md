# Instructions pour mettre à jour la clé API Gemini

## 🔑 Situation actuelle

- **Clé actuelle dans `.env`** : `AIzaSyDyHsxNriGf0EHGTjdH8d_nBQ5pbpyg0KU`
- **Clé mentionnée comme incorrecte** : `AIzaSyAgtZszPmgw1INQhokor4h0DCLzMnsjgUE`

## 📋 Étapes pour mettre à jour la clé

### 1. Mise à jour du fichier `.env` (Développement local)

**Option A : Édition manuelle**
```bash
# Ouvrir le fichier .env et remplacer la ligne :
EXPO_PUBLIC_GEMINI_API_KEY=VOTRE_NOUVELLE_CLE_API_ICI
```

**Option B : Via PowerShell**
```powershell
# Remplacer la clé dans .env
$newKey = "VOTRE_NOUVELLE_CLE_API_ICI"
(Get-Content .env) -replace 'EXPO_PUBLIC_GEMINI_API_KEY=.*', "EXPO_PUBLIC_GEMINI_API_KEY=$newKey" | Set-Content .env
```

### 2. Mise à jour EAS Secrets (Builds cloud)

Pour que la clé fonctionne lors des builds EAS (development, preview, production) :

```bash
# Mettre à jour le secret pour chaque environnement
eas env:update EXPO_PUBLIC_GEMINI_API_KEY --value "VOTRE_NOUVELLE_CLE_API_ICI" --environment development --scope sensitive
eas env:update EXPO_PUBLIC_GEMINI_API_KEY --value "VOTRE_NOUVELLE_CLE_API_ICI" --environment preview --scope sensitive
eas env:update EXPO_PUBLIC_GEMINI_API_KEY --value "VOTRE_NOUVELLE_CLE_API_ICI" --environment production --scope sensitive
```

### 3. Vérification

**Vérifier que la clé est bien chargée :**
```typescript
// Dans l'app, vérifier dans la console :
import { GEMINI_CONFIG } from './src/config/geminiConfig';
console.log('Clé Gemini configurée:', !!GEMINI_CONFIG.apiKey);
console.log('Premiers caractères:', GEMINI_CONFIG.apiKey?.substring(0, 20));
```

**Tester le service Kouakou :**
- Ouvrir l'écran de chat avec Kouakou
- Envoyer un message test : "Bonjour Kouakou"
- Vérifier qu'il répond correctement

## ⚠️ Sécurité

- ✅ Le fichier `.env` est dans `.gitignore` (ne sera pas commité)
- ✅ Les secrets EAS sont stockés de manière sécurisée
- ❌ Ne jamais commiter la clé dans le code source

## 🔍 Où la clé est utilisée

1. **`src/config/geminiConfig.ts`** : Configuration globale
   - Lit depuis `Constants.expoConfig?.extra?.geminiApiKey`
   - Ou depuis `process.env.EXPO_PUBLIC_GEMINI_API_KEY`

2. **`app.config.js`** : Configuration Expo
   - Lit `process.env.EXPO_PUBLIC_GEMINI_API_KEY`
   - Met dans `extra.geminiApiKey`

3. **`src/hooks/useChatAgent.ts`** : Initialisation de Kouakou
   - Utilise `GEMINI_CONFIG.apiKey` pour créer `GeminiConversationalAgent`

4. **`src/services/agent/GeminiConversationalAgent.ts`** : Agent principal
   - Utilise la clé pour appeler l'API Gemini

## 🧪 Tester après mise à jour

1. Redémarrer Metro : `npm start`
2. Ouvrir l'app et aller dans le chat Kouakou
3. Envoyer : "Bonjour Kouakou"
4. Vérifier qu'il répond (si la clé est valide)

## ❌ Si la clé est invalide

Si la clé est invalide, Kouakou utilisera le fallback Jaccard (sans IA), mais :
- ⚠️ Les réponses seront moins intelligentes
- ⚠️ La détection d'intention sera moins précise
- ✅ L'agent fonctionnera quand même (mode dégradé)

