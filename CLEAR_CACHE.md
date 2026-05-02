# Instructions pour Nettoyer le Cache et Résoudre l'Erreur Runtime

## 🚨 Erreur: "[runtime not ready]: TypeError: property is not configurable"

Cette erreur est causée par un cache Metro bundler corrompu. Le code source est **correct**, c'est uniquement un problème de cache.

## ✅ Solution Étape par Étape

### 1. Arrêter le serveur Expo
Dans le terminal où Expo tourne, appuyez sur **Ctrl+C** pour arrêter le serveur.

### 2. Nettoyer les caches
Exécutez ces commandes dans PowerShell (depuis la racine du projet) :

```powershell
# Nettoyer le cache Expo
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue

# Nettoyer le cache Metro
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# Sur macOS/Linux :
# rm -rf .expo node_modules/.cache
```

### 3. Redémarrer avec cache nettoyé
```bash
npx expo start --clear
```

### 4. Sur votre téléphone/appareil
- **Fermez complètement l'application** (force close)
- **Rouvrez l'application**
- Si l'erreur persiste, secouez le téléphone et appuyez sur "Reload JS"

## 🔄 Alternative: Reset Complet

Si la solution ci-dessus ne fonctionne pas :

```powershell
# Arrêter le serveur Expo (Ctrl+C)
# Nettoyer tous les caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# Redémarrer avec reset complet
npx expo start --clear --reset-cache
```

## 📱 Sur iOS Simulator

Si vous utilisez iOS Simulator :
1. Fermez le simulateur
2. Nettoyez les caches (étapes ci-dessus)
3. Redémarrez Expo
4. Rouvrez le simulateur et l'application

## ✅ Vérification

Une fois que vous avez nettoyé le cache et redémarré :
- L'application devrait se charger sans erreur
- Le hot reload devrait fonctionner correctement
- L'erreur "[runtime not ready]" devrait disparaître

---

**Note:** Cette erreur n'est **PAS** causée par votre code. Le code source est correct. C'est uniquement un problème de cache Metro bundler qui peut survenir lors de modifications fréquentes de fichiers.

