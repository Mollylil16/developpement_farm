# 🔧 Comment Supprimer la Base de Données

Si vous rencontrez l'erreur **"near 'notes': syntax error"**, vous devez supprimer la base de données pour la recréer.

## 🚀 Méthode 1 : Script Automatique (Recommandé)

1. **Fermez complètement l'application Expo** (Ctrl+C dans le terminal)

2. **Exécutez le script PowerShell :**
   ```powershell
   .\scripts\delete-database.ps1
   ```

3. **Suivez les instructions à l'écran**
   - Le script trouvera automatiquement la base de données
   - Tapez `O` pour confirmer la suppression

4. **Redémarrez l'application :**
   ```bash
   npx expo start --clear
   ```

5. **Créez un nouveau projet dans l'app**
   - La base de données sera recréée automatiquement avec le bon schéma

---

## 🔧 Méthode 2 : Suppression Manuelle

### Étape 1 : Fermer l'application
- Fermez complètement l'application Expo (Ctrl+C)
- Fermez Expo Go sur votre téléphone/émulateur

### Étape 2 : Trouver la base de données

**Option A : Via l'Explorateur Windows**
1. Appuyez sur `Windows + R`
2. Tapez : `%USERPROFILE%\.expo\databases\SQLite\`
3. Appuyez sur Entrée
4. Cherchez le fichier `fermier_pro.db`

**Option B : Via PowerShell**
```powershell
# Afficher le chemin
$env:USERPROFILE\.expo\databases\SQLite\fermier_pro.db
```

### Étape 3 : Supprimer les fichiers

Supprimez **tous** ces fichiers s'ils existent :
- `fermier_pro.db`
- `fermier_pro.db-wal` (fichier WAL)
- `fermier_pro.db-shm` (fichier de mémoire partagée)

### Étape 4 : Autres emplacements possibles

Si vous ne trouvez pas la base de données, vérifiez aussi :
- `%USERPROFILE%\AppData\Local\expo\databases\SQLite\fermier_pro.db`
- `%USERPROFILE%\.expo\fermier_pro.db`

### Étape 5 : Redémarrer l'application

```bash
npx expo start --clear
```

---

## ✅ Vérification

Après suppression et redémarrage :
1. ✅ L'application démarre sans erreur
2. ✅ Vous pouvez créer un nouveau projet
3. ✅ La base de données est recréée automatiquement
4. ✅ L'erreur "near 'notes': syntax error" ne devrait plus apparaître

---

## ⚠️ Important

- **Toutes vos données seront perdues** lors de la suppression
- En développement, c'est normal de supprimer la base de données
- En production, utilisez les migrations pour corriger les schémas

---

## 🆘 Si le problème persiste

1. Vérifiez que l'application est complètement fermée
2. Vérifiez que vous avez les permissions d'écriture
3. Essayez de redémarrer votre ordinateur
4. Vérifiez les logs de l'application pour d'autres erreurs

