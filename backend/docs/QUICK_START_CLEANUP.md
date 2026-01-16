# 🚀 Guide Rapide : Configuration du Cleanup des Invitations

## ⚡ Configuration en 3 Étapes

### 1️⃣ Ajouter la Variable d'Environnement

Ouvrez `backend/.env` et ajoutez cette ligne :

```env
CLEANUP_SECRET=436de831bff0006df55df1f74a7f74ebbdd0ed7c2ca97b4e29559aad7284d260
```

**⚠️ Important** : Remplacez le secret ci-dessus par votre propre secret généré :

```bash
# Générer un nouveau secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2️⃣ Redémarrer le Backend

```bash
cd backend
npm run start:dev
```

### 3️⃣ Tester l'Endpoint

```bash
# Avec curl
curl "http://localhost:3000/collaborations/cleanup-expired?secret=VOTRE_SECRET"

# Avec PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/collaborations/cleanup-expired?secret=VOTRE_SECRET"
```

**Réponse attendue** :
```json
{
  "success": true,
  "expiredInvitationsCount": 0,
  "message": "0 invitation(s) expirée(s) ont été nettoyée(s)"
}
```

---

## 📅 Configurer le Cron Job

### Option Simple : Script Node.js (Recommandé)

1. **Utiliser le script fourni** : `backend/scripts/cleanup-invitations.js`

2. **Configurer le cron** (Linux/Mac) :
   ```bash
   crontab -e
   ```
   
   Ajoutez :
   ```cron
   0 2 * * * cd /chemin/vers/backend && node scripts/cleanup-invitations.js
   ```

3. **Ou avec Task Scheduler** (Windows) :
   - Programme : `node.exe`
   - Arguments : `scripts/cleanup-invitations.js`
   - Dossier de départ : `C:\chemin\vers\backend`
   - Variables d'environnement : Ajoutez `CLEANUP_SECRET`

### Option Cloud : Render / Railway

1. **Ajoutez `CLEANUP_SECRET`** dans les variables d'environnement du service
2. **Créez un Cron Job** qui appelle :
   ```
   curl "https://votre-api.com/collaborations/cleanup-expired?secret=${CLEANUP_SECRET}"
   ```

---

## 📚 Documentation Complète

Pour plus de détails, consultez : `backend/docs/CONFIGURATION_CLEANUP_CRON.md`

---

**Secret généré pour vous** :
```
436de831bff0006df55df1f74a7f74ebbdd0ed7c2ca97b4e29559aad7284d260
```

⚠️ **Changez ce secret en production !**
