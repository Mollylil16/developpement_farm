# 🔍 INSTRUCTIONS DE DÉBOGAGE - MODE DEBUG ACTIVÉ

## 📋 OBJECTIF
Identifier EXACTEMENT quel composant cause les 2 erreurs persistantes :
1. ❌ "Maximum update depth exceeded" (Reproduction)
2. ❌ "Text strings must be rendered within a <Text> component" (Démarrage)

---

## 🔴 ERREUR #1 : Maximum update depth exceeded (Reproduction)

### **Quand elle apparaît :**
Uniquement quand vous cliquez sur le menu "Reproduction"

### **Actions de débogage :**

1. **Ouvrez la console Metro** (terminal où tourne `npm start`)

2. **Cliquez sur Reproduction** et observez les logs

3. **Cherchez dans la console :**
   - Des messages avec `🔴 BOUCLE INFINIE DÉTECTÉE`
   - Des messages avec `⚠️ Re-renders excessifs`
   - Le stack trace de l'erreur "Maximum update depth exceeded"

4. **Prenez une capture d'écran** du stack trace complet

5. **Composants suspects à vérifier :**
   - `GestationsListComponent`
   - `SevragesListComponent`
   - `GestationsCalendarComponent`
   - `ProtectedScreen`
   - `ReproductionWidget`

---

## 🔴 ERREUR #2 : Text strings must be rendered within a <Text> component (Démarrage)

### **Quand elle apparaît :**
Au démarrage de l'application

### **Actions de débogage :**

1. **Redémarrez l'application complètement**

2. **Observez la console dès le démarrage**

3. **Cherchez dans la console :**
   - Le stack trace complet de l'erreur
   - Le nom du composant qui essaie de rendre `undefined` ou `null`

4. **Prenez une capture d'écran** du message d'erreur ET du stack trace

5. **Composants suspects à vérifier :**
   - `LoadingScreen` (App.tsx)
   - `DashboardScreen` header
   - `AlertesWidget`
   - Widgets du Dashboard

---

## 📸 INFORMATIONS À ME FOURNIR

Pour chaque erreur, envoyez-moi :

### Pour "Maximum update depth exceeded" :
```
1. Le stack trace complet (copier-coller du terminal)
2. Les derniers logs avant l'erreur
3. Le nom du composant mentionné dans le stack trace
```

### Pour "Text strings must be rendered..." :
```
1. Le message d'erreur complet
2. Le stack trace (lignes commençant par "at ...")
3. Le nom du composant mentionné
```

---

## 🛠️ COMMANDES UTILES

### Nettoyer complètement et redémarrer :
```powershell
# Arrêter Metro (Ctrl+C)
npm start -- --reset-cache
```

### Activer les logs React Native :
Dans votre terminal Metro, les logs s'affichent automatiquement.

---

## 💡 CE QUI A ÉTÉ FAIT

✅ 19 corrections appliquées
✅ Permissions fonctionnent
✅ ErrorBoundary amélioré avec logs détaillés
✅ Utilitaires de debug ajoutés

---

## 🎯 PROCHAINES ÉTAPES

1. **Testez l'application**
2. **Lisez attentivement les logs dans la console**
3. **Envoyez-moi les stack traces des 2 erreurs**
4. Je pourrai alors identifier EXACTEMENT quel composant pose problème

---

## 📝 FORMAT DU STACK TRACE

Un stack trace ressemble à ça :
```
Error: Text strings must be rendered within a <Text> component.
    at renderTextToJSX (...)
    at AlertesWidget (src/components/AlertesWidget.tsx:225)
    at DashboardScreen (src/screens/DashboardScreen.tsx:240)
    ...
```

**Copiez TOUT** et envoyez-le moi !

