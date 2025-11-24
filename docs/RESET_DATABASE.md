# 🔧 Réinitialisation de la Base de Données

## ⚠️ Problème Détecté

Votre base de données SQLite est **corrompue** à cause de migrations échouées :

```
❌ no such table: production_animaux
❌ database table is locked
❌ there is already another table or index with this name: vaccinations_old
```

**Conséquence :** Les animaux disparaissent après modification du statut.

---

## 🛠️ Solution : Réinitialisation Complète

### Option A : Script Automatique (Recommandé) ✅

**1. Fermez complètement l'application Expo** (Ctrl+C dans le terminal)

**2. Exécutez le script PowerShell :**

```powershell
.\reset-database.ps1
```

**3. Suivez les instructions à l'écran**
   - Le script trouvera automatiquement la base de données
   - Il vous demandera confirmation avant suppression
   - Tapez `OUI` pour confirmer

**4. Redémarrez l'application :**

```bash
npx expo start --clear
```

**5. Créez un nouveau projet dans l'app**
   - La base de données sera recréée proprement
   - Toutes les tables seront créées correctement

---

### Option B : Suppression Manuelle 🔧

Si le script ne fonctionne pas, suivez ces étapes :

**1. Fermez l'application Expo**

**2. Ouvrez l'Explorateur Windows**

**3. Cherchez et supprimez ces fichiers :**

```
%USERPROFILE%\.expo\databases\SQLite\fermier_pro.db
%USERPROFILE%\.expo\databases\SQLite\fermier_pro.db-wal
%USERPROFILE%\.expo\databases\SQLite\fermier_pro.db-shm
```

**Comment y accéder :**
- Appuyez sur `Windows + R`
- Tapez : `%USERPROFILE%\.expo\databases\SQLite\`
- Appuyez sur Entrée
- Supprimez tous les fichiers commençant par `fermier_pro.db`

**4. Autres emplacements possibles :**

```
%USERPROFILE%\AppData\Local\expo\databases\SQLite\fermier_pro.db
%USERPROFILE%\.expo\fermier_pro.db
```

**5. Redémarrez l'application**

```bash
npx expo start --clear
```

---

## 🎯 Vérification Après Réinitialisation

### 1. Console Metro Bundler

Vous devriez voir ces logs au démarrage :

```
✅ Base de données initialisée avec succès
✅ Tables créées
✅ Migrations appliquées
✅ Index créés
```

### 2. Créez un Nouveau Projet

- Nom : `Test Reset`
- Effectif : 2 truies, 1 verrat, 2 porcelets

### 3. Vérifiez les Écrans

**Dashboard > Vue d'Ensemble :**
```
Truies: 2
Verrats: 1  
Porcelets: 2
```

**Production > Cheptel :**
- Vous devriez voir **5 animaux**

**Console Metro :**
```
🔍 [loadProductionAnimaux] Chargement pour projetId: ...
🐷 [loadProductionAnimaux] Animaux chargés: 5
```

### 4. Testez le Changement de Statut

- Allez sur **Production > Cheptel**
- Sélectionnez un animal
- Changez son statut (ex: `vendu`)
- **Les autres animaux doivent rester visibles !** ✅

**Console Metro :**
```
🔄 [updateProductionAnimal.fulfilled] Animal mis à jour: ...
🔄 [updateProductionAnimal.fulfilled] Nouveau statut: vendu
🔄 [updateProductionAnimal.fulfilled] ids.animaux AVANT: 5
🔄 [updateProductionAnimal.fulfilled] ids.animaux APRÈS: 5
🔄 [updateProductionAnimal.fulfilled] entities.animaux count: 5
```

---

## 🐛 Si le Problème Persiste

### Scénario 1 : Les animaux disparaissent encore

**Cause probable :** Bug dans le reducer Redux

**Solution :**
1. Partagez les logs de la console (tous les logs avec 🔄, 🔍, 🐷)
2. Je vais corriger le reducer `updateProductionAnimal.fulfilled`

### Scénario 2 : Erreur "no such table"

**Cause probable :** Migration échouée

**Solution :**
1. Vérifiez `src/services/database.ts` ligne 62 (`migrateTables()`)
2. Vérifiez que toutes les migrations dans `src/database/migrations/` sont valides
3. Partagez l'erreur exacte

### Scénario 3 : "database is locked"

**Cause probable :** Plusieurs instances de l'app

**Solution :**
1. Fermez **TOUTES** les instances de l'app (y compris simulateurs/émulateurs)
2. Tuez le processus Metro Bundler (Ctrl+C)
3. Attendez 10 secondes
4. Relancez : `npx expo start --clear`

---

## 💾 Sauvegarde des Données (Optionnel)

Si vous voulez sauvegarder vos données avant réinitialisation :

**1. Copiez le fichier de base de données :**

```powershell
Copy-Item "$env:USERPROFILE\.expo\databases\SQLite\fermier_pro.db" -Destination ".\fermier_pro_backup_$(Get-Date -Format 'yyyy-MM-dd').db"
```

**2. Pour restaurer plus tard :**

```powershell
Copy-Item ".\fermier_pro_backup_*.db" -Destination "$env:USERPROFILE\.expo\databases\SQLite\fermier_pro.db" -Force
```

⚠️ **Attention :** La restauration remettra la base de données corrompue !

---

## 📝 Logs à Surveiller

Après réinitialisation, surveillez ces logs dans la console :

### ✅ Logs Normaux (Bonne Santé)

```
🔍 [loadProductionAnimaux] Chargement pour projetId: projet_xxx
🐷 [loadProductionAnimaux] Animaux chargés: 5
🔄 [updateProductionAnimal.fulfilled] ids.animaux AVANT: 5
🔄 [updateProductionAnimal.fulfilled] ids.animaux APRÈS: 5
```

### ❌ Logs d'Erreur (Problème)

```
❌ Erreur lors de la migration production_animaux
❌ no such table: ...
❌ database table is locked
⚠️ [loadProductionAnimaux] Animaux chargés: 0
```

---

## 🚀 Prêt ?

1. **Fermez l'app Expo** (Ctrl+C)
2. **Exécutez le script :** `.\reset-database.ps1`
3. **Confirmez avec "OUI"**
4. **Redémarrez :** `npx expo start --clear`
5. **Créez un projet test**
6. **Partagez les résultats !**

---

**Bonne chance ! 🍀**

