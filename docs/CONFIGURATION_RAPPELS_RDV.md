# ⏰ Configuration des Rappels de Rendez-vous

## 📋 Vue d'ensemble

Le système de rappels envoie automatiquement des notifications aux producteurs et vétérinaires le jour de leurs rendez-vous.

---

## 🔧 Configuration

### Option 1 : Cron Job Externe (Recommandé pour Production)

Utiliser un service externe (ex: Render Cron Jobs, GitHub Actions, etc.) pour appeler l'endpoint quotidiennement.

**Endpoint à appeler :**
```
POST /appointments/reminders/send
```

**Fréquence recommandée :** Tous les jours à 8h00 (heure locale)

**Exemple avec curl :**
```bash
curl -X POST https://votre-backend.onrender.com/appointments/reminders/send \
  -H "Authorization: Bearer VOTRE_TOKEN_SECRET"
```

### Option 2 : @nestjs/schedule (Pour développement)

Si vous souhaitez utiliser un cron job intégré, installez le package :

```bash
npm install @nestjs/schedule
```

Puis modifiez `appointments.module.ts` :

```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    DatabaseModule,
    MarketplaceModule,
    ScheduleModule.forRoot(), // Ajouter cette ligne
  ],
  // ...
})
```

Et ajoutez un décorateur `@Cron` dans `appointment-reminders.service.ts` :

```typescript
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AppointmentRemindersService {
  // ...

  @Cron('0 8 * * *') // Tous les jours à 8h00
  async handleDailyReminders() {
    await this.sendDailyReminders();
  }
}
```

### Option 3 : Render Cron Jobs

Sur Render, configurez un cron job :

1. Allez dans votre service backend
2. Ajoutez un "Cron Job"
3. Configurez :
   - **Schedule** : `0 8 * * *` (tous les jours à 8h00 UTC)
   - **Command** : `curl -X POST https://votre-backend.onrender.com/appointments/reminders/send -H "Authorization: Bearer VOTRE_TOKEN_SECRET"`

---

## 🔐 Sécurité

Pour protéger l'endpoint `/appointments/reminders/send`, vous pouvez :

1. **Utiliser un token secret** dans les headers
2. **Ajouter un guard personnalisé** qui vérifie le token
3. **Restreindre l'accès** à certaines IPs uniquement

Exemple de guard :

```typescript
@Injectable()
export class CronJobGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const expectedToken = process.env.CRON_JOB_SECRET;
    
    return authHeader === `Bearer ${expectedToken}`;
  }
}
```

---

## 📊 Logs

Le service logge automatiquement :
- Nombre de rendez-vous trouvés
- Nombre de rappels envoyés avec succès
- Nombre d'erreurs

Exemple de logs :
```
[AppointmentReminders] Démarrage de l'envoi des rappels quotidiens
[AppointmentReminders] 3 rendez-vous trouvé(s) pour aujourd'hui
[AppointmentReminders] Rappel envoyé pour le rendez-vous appointment_123
[AppointmentReminders] Rappels envoyés: 3 succès, 0 erreurs
```

---

## ✅ Vérification

Pour tester manuellement :

```bash
curl -X POST http://localhost:3000/appointments/reminders/send \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

Réponse attendue :
```json
{
  "sent": 2,
  "errors": 0
}
```

---

## 🎯 Fonctionnement

1. Le service recherche tous les rendez-vous **acceptés** du jour
2. Vérifie qu'ils n'ont pas encore reçu de rappel (`reminder_sent = FALSE`)
3. Envoie une notification au producteur ET au vétérinaire
4. Marque le rendez-vous comme `reminder_sent = TRUE`

---

## ⚠️ Notes importantes

- Les rappels sont envoyés **une seule fois** par rendez-vous
- Seuls les rendez-vous avec statut `accepted` reçoivent des rappels
- Les rappels sont envoyés le jour même du rendez-vous (pas la veille)
- Pour envoyer des rappels la veille, modifiez la requête SQL pour chercher les RDV de demain
