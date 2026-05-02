# 🔧 Configuration du Cron Job pour le Nettoyage des Invitations Expirées

## 📋 Vue d'ensemble

Le système de nettoyage automatique des invitations expirées nécessite :
1. **Variable d'environnement** : `CLEANUP_SECRET` pour sécuriser l'endpoint
2. **Cron job** : Appel quotidien de l'endpoint de cleanup

---

## 1️⃣ Configuration de la Variable d'Environnement

### Étape 1 : Ajouter `CLEANUP_SECRET` dans `backend/.env`

Ouvrez le fichier `backend/.env` et ajoutez :

```env
# ============================================
# CLEANUP CRON JOB CONFIGURATION
# ============================================
CLEANUP_SECRET=votre_secret_super_securise_ici_changez_moi
```

### Étape 2 : Générer un Secret Sécurisé

Générez un secret aléatoire et sécurisé :

```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: OpenSSL
openssl rand -hex 32

# Option 3: PowerShell (Windows)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Exemple de secret généré** :
```
CLEANUP_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### Étape 3 : Redémarrer le Backend

Après avoir ajouté la variable, redémarrez votre serveur backend :

```bash
cd backend
npm run start:dev
```

---

## 2️⃣ Configuration du Cron Job

### Option A : Cron Job Local (Linux/Mac)

#### Étape 1 : Créer un Script Shell

Créez le fichier `backend/scripts/cleanup-invitations.sh` :

```bash
#!/bin/bash

# Configuration
API_URL="http://localhost:3000"
SECRET="votre_secret_super_securise_ici"

# Appel de l'endpoint
curl -X GET "${API_URL}/collaborations/cleanup-expired?secret=${SECRET}"

# Log avec timestamp
echo "$(date): Cleanup des invitations expirées exécuté" >> /var/log/fermier-pro-cleanup.log
```

#### Étape 2 : Rendre le Script Exécutable

```bash
chmod +x backend/scripts/cleanup-invitations.sh
```

#### Étape 3 : Configurer le Cron Job

Éditez le crontab :

```bash
crontab -e
```

Ajoutez cette ligne pour exécuter le cleanup **tous les jours à 2h du matin** :

```cron
0 2 * * * /chemin/vers/backend/scripts/cleanup-invitations.sh
```

**Exemple avec chemin complet** :
```cron
0 2 * * * /home/user/developpement_farm/backend/scripts/cleanup-invitations.sh
```

**Autres exemples de planning** :
- `0 2 * * *` : Tous les jours à 2h00
- `0 */6 * * *` : Toutes les 6 heures
- `0 0 * * 0` : Tous les dimanches à minuit
- `*/30 * * * *` : Toutes les 30 minutes (pour tests)

---

### Option B : Cron Job avec Render (Production)

#### Étape 1 : Configurer la Variable d'Environnement sur Render

1. Allez sur votre dashboard Render : https://dashboard.render.com
2. Sélectionnez votre service backend
3. Allez dans **Environment** → **Environment Variables**
4. Ajoutez :
   - **Key** : `CLEANUP_SECRET`
   - **Value** : Votre secret généré

#### Étape 2 : Créer un Cron Job sur Render

1. Dans votre dashboard Render, cliquez sur **New** → **Cron Job**
2. Configurez :
   - **Name** : `Cleanup Expired Invitations`
   - **Schedule** : `0 2 * * *` (tous les jours à 2h)
   - **Command** :
     ```bash
     curl -X GET "https://votre-api.onrender.com/collaborations/cleanup-expired?secret=${CLEANUP_SECRET}"
     ```
   - **Environment Variables** : Ajoutez `CLEANUP_SECRET` (sera disponible via `${CLEANUP_SECRET}`)

---

### Option C : Cron Job avec Railway

#### Étape 1 : Configurer la Variable d'Environnement

1. Allez sur votre projet Railway
2. Sélectionnez votre service backend
3. Allez dans **Variables**
4. Ajoutez `CLEANUP_SECRET` avec votre secret

#### Étape 2 : Créer un Cron Job

1. Créez un nouveau service de type **Cron**
2. Configurez :
   - **Schedule** : `0 2 * * *`
   - **Command** :
     ```bash
     curl -X GET "https://votre-api.railway.app/collaborations/cleanup-expired?secret=${CLEANUP_SECRET}"
     ```

---

### Option D : Cron Job avec Node.js (Alternative)

Créez un script Node.js qui peut être exécuté par un cron job :

**Fichier** : `backend/scripts/cleanup-invitations.js`

```javascript
const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3000';
const SECRET = process.env.CLEANUP_SECRET;

if (!SECRET) {
  console.error('❌ CLEANUP_SECRET non configuré dans les variables d\'environnement');
  process.exit(1);
}

async function cleanupExpiredInvitations() {
  try {
    console.log(`🔄 Exécution du cleanup des invitations expirées...`);
    const response = await axios.get(`${API_URL}/collaborations/cleanup-expired`, {
      params: { secret: SECRET },
    });
    
    console.log(`✅ ${response.data.message}`);
    console.log(`📊 ${response.data.expiredInvitationsCount} invitation(s) expirée(s) nettoyée(s)`);
  } catch (error) {
    console.error('❌ Erreur lors du cleanup:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data);
    }
    process.exit(1);
  }
}

cleanupExpiredInvitations();
```

**Cron job** :
```cron
0 2 * * * cd /chemin/vers/backend && node scripts/cleanup-invitations.js
```

---

### Option E : Cron Job avec Windows Task Scheduler

#### Étape 1 : Créer un Script PowerShell

Créez `backend/scripts/cleanup-invitations.ps1` :

```powershell
# Configuration
$API_URL = "http://localhost:3000"
$SECRET = $env:CLEANUP_SECRET

if (-not $SECRET) {
    Write-Host "❌ CLEANUP_SECRET non configuré" -ForegroundColor Red
    exit 1
}

# Appel de l'endpoint
try {
    $response = Invoke-RestMethod -Uri "${API_URL}/collaborations/cleanup-expired?secret=${SECRET}" -Method Get
    Write-Host "✅ $($response.message)" -ForegroundColor Green
    Write-Host "📊 $($response.expiredInvitationsCount) invitation(s) expirée(s) nettoyée(s)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
```

#### Étape 2 : Configurer Task Scheduler

1. Ouvrez **Task Scheduler** (Planificateur de tâches)
2. Créez une **Tâche de base**
3. Configurez :
   - **Nom** : `Cleanup Expired Invitations`
   - **Déclencheur** : Quotidien à 2h00
   - **Action** : Démarrer un programme
   - **Programme** : `powershell.exe`
   - **Arguments** : `-File "C:\chemin\vers\backend\scripts\cleanup-invitations.ps1"`
   - **Variables d'environnement** : Ajoutez `CLEANUP_SECRET`

---

## 3️⃣ Test du Cron Job

### Test Manuel

Testez l'endpoint manuellement avant de configurer le cron :

```bash
# Avec curl
curl -X GET "http://localhost:3000/collaborations/cleanup-expired?secret=votre_secret"

# Avec PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/collaborations/cleanup-expired?secret=votre_secret" -Method Get

# Avec Node.js
node -e "const axios = require('axios'); axios.get('http://localhost:3000/collaborations/cleanup-expired', { params: { secret: process.env.CLEANUP_SECRET } }).then(r => console.log(r.data)).catch(e => console.error(e.message));"
```

### Réponse Attendue

```json
{
  "success": true,
  "expiredInvitationsCount": 5,
  "message": "5 invitation(s) expirée(s) ont été nettoyée(s)"
}
```

---

## 4️⃣ Vérification et Monitoring

### Vérifier que le Cron Fonctionne

1. **Vérifier les logs du cron** :
   ```bash
   # Linux/Mac
   tail -f /var/log/fermier-pro-cleanup.log
   
   # Ou vérifier les logs système
   journalctl -u cron -f
   ```

2. **Vérifier les invitations expirées dans la base** :
   ```sql
   SELECT COUNT(*) 
   FROM collaborations 
   WHERE statut = 'expire';
   ```

3. **Vérifier les invitations en attente non expirées** :
   ```sql
   SELECT COUNT(*) 
   FROM collaborations 
   WHERE statut = 'en_attente' 
   AND (expiration_date IS NULL OR expiration_date > NOW());
   ```

---

## 5️⃣ Sécurité

### ⚠️ Bonnes Pratiques

1. **Secret Fort** : Utilisez un secret d'au moins 32 caractères
2. **HTTPS en Production** : Utilisez toujours HTTPS pour les appels cron
3. **Ne Pas Commiter le Secret** : Vérifiez que `.env` est dans `.gitignore`
4. **Rotation des Secrets** : Changez le secret régulièrement (tous les 3-6 mois)
5. **Limiter l'Accès** : L'endpoint ne doit être accessible que depuis le cron job

### 🔒 Protection Supplémentaire (Optionnel)

Vous pouvez ajouter une vérification d'IP dans le controller :

```typescript
// Dans collaborations.controller.ts
async cleanupExpiredInvitations(
  @Query('secret') secret: string,
  @Ip() ip: string
) {
  // Vérifier le secret
  const expectedSecret = process.env.CLEANUP_SECRET || 'default-cleanup-secret-change-me';
  if (secret !== expectedSecret) {
    throw new UnauthorizedException('Secret invalide');
  }

  // Optionnel : Vérifier l'IP (si vous connaissez l'IP du serveur cron)
  const allowedIPs = process.env.CLEANUP_ALLOWED_IPS?.split(',') || [];
  if (allowedIPs.length > 0 && !allowedIPs.includes(ip)) {
    throw new ForbiddenException('IP non autorisée');
  }

  // ... reste du code
}
```

---

## 6️⃣ Dépannage

### Problème : Le cron ne s'exécute pas

**Solutions** :
1. Vérifier que le cron est actif : `systemctl status cron` (Linux)
2. Vérifier les logs : `journalctl -u cron -n 50`
3. Tester le script manuellement : `./scripts/cleanup-invitations.sh`
4. Vérifier les permissions : `chmod +x scripts/cleanup-invitations.sh`

### Problème : Erreur 401 (Unauthorized)

**Solutions** :
1. Vérifier que `CLEANUP_SECRET` est bien configuré dans `.env`
2. Vérifier que le secret dans le cron correspond à celui dans `.env`
3. Redémarrer le backend après modification de `.env`

### Problème : Erreur de connexion

**Solutions** :
1. Vérifier que le backend est en cours d'exécution
2. Vérifier l'URL de l'API (localhost vs production)
3. Vérifier les variables d'environnement dans le cron

---

## 📝 Checklist de Configuration

- [ ] Variable `CLEANUP_SECRET` ajoutée dans `backend/.env`
- [ ] Secret généré et sécurisé (32+ caractères)
- [ ] Backend redémarré après modification de `.env`
- [ ] Endpoint testé manuellement avec succès
- [ ] Cron job configuré (local ou cloud)
- [ ] Script de cleanup créé et testé
- [ ] Logs configurés pour le monitoring
- [ ] Documentation partagée avec l'équipe

---

**Date de création** : 2025-01-XX  
**Dernière mise à jour** : 2025-01-XX
