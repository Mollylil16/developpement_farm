# 🔧 Modifications Manuelles Requises pour l'Intégration Gemini

## 📋 Résumé

Pour que l'intégration Gemini fonctionne correctement dans l'application, vous devez effectuer une modification manuelle :

## ✅ Modification Requise : Fichier `.env`

### 1. Créer le fichier `.env` à la racine du projet

Le fichier `.env` n'existe pas encore et doit être créé manuellement (il est dans `.gitignore` pour ne pas être committé).

### 2. Ajouter la variable d'environnement Gemini

Créez le fichier `.env` à la racine du projet (`C:\Users\HP\developpement_farm\.env`) avec le contenu suivant :

```env
# Configuration Gemini pour l'agent conversationnel
# Obtenez votre clé API sur https://makersuite.google.com/app/apikey
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Ancienne clé OpenAI (commentée - n'est plus utilisée)
# EXPO_PUBLIC_OPENAI_API_KEY=
```

### 3. Pourquoi `EXPO_PUBLIC_` ?

Expo/React Native n'expose que les variables d'environnement qui commencent par `EXPO_PUBLIC_`. C'est pour cela que nous utilisons `EXPO_PUBLIC_GEMINI_API_KEY` au lieu de simplement `GEMINI_API_KEY`.

## 📝 Comment Créer le Fichier `.env`

### Option 1 : Créer manuellement

1. Ouvrez votre éditeur de texte (VS Code, Notepad++, etc.)
2. Créez un nouveau fichier nommé `.env` à la racine du projet
3. Ajoutez le contenu ci-dessus
4. Sauvegardez

### Option 2 : Via PowerShell

```powershell
# Depuis la racine du projet
@"
# Configuration Gemini pour l'agent conversationnel
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
"@ | Out-File -FilePath .env -Encoding utf8
```

## ✅ Vérification

Après avoir créé le fichier `.env`, vérifiez qu'il existe :

```powershell
Test-Path .env
Get-Content .env
```

## ⚠️ Note sur les Tests

Le fichier de test `test-gemini.ts` fonctionne **sans** le fichier `.env` car la clé API est codée en dur dans le script pour les tests. Cependant, pour que l'application fonctionne correctement en production, vous devez créer le fichier `.env`.

## 🔒 Sécurité

- ⚠️ **Ne committez JAMAIS** le fichier `.env` dans Git (il est déjà dans `.gitignore`)
- ⚠️ **Ne partagez JAMAIS** votre clé API publiquement
- ✅ La clé API dans ce document est déjà exposée, mais vous pouvez la régénérer depuis votre compte Google Cloud si nécessaire

## 📚 Documentation

- Documentation Gemini API : https://ai.google.dev/
- Obtenir une clé API : https://makersuite.google.com/app/apikey
- Documentation Expo Environment Variables : https://docs.expo.dev/guides/environment-variables/

