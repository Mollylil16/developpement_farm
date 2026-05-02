# 📖 Guide d'utilisation - Système de Rendez-vous Vétérinaires

## 🎯 Vue d'ensemble

Le système de rendez-vous permet aux producteurs de demander des rendez-vous aux vétérinaires validés, et aux vétérinaires de gérer ces demandes.

---

## 👨‍🌾 CÔTÉ PRODUCTEUR

### 1. Demander un rendez-vous

1. Aller dans **Santé > Vétérinaire > Rechercher un vétérinaire**
2. Choisir un vétérinaire dans la liste
3. Cliquer sur **"Demander RDV"**
4. Remplir le formulaire :
   - **Date** : Sélectionner la date souhaitée
   - **Heure** : Sélectionner l'heure souhaitée
   - **Raison** : Décrire la raison du rendez-vous (minimum 10 caractères)
   - **Lieu** : Indiquer le lieu d'intervention (optionnel)
5. Cliquer sur **"Envoyer la demande"**

### 2. Suivre ses rendez-vous

- Les rendez-vous apparaissent dans le dashboard
- Statuts possibles :
  - **En attente** : Le vétérinaire n'a pas encore répondu
  - **Accepté** : Le vétérinaire a accepté
  - **Refusé** : Le vétérinaire a refusé
  - **Annulé** : Rendez-vous annulé
  - **Terminé** : Rendez-vous effectué

### 3. Notifications

- Notification quand le vétérinaire accepte
- Notification quand le vétérinaire refuse
- Notification de rappel le jour du RDV (à venir)

---

## 👨‍⚕️ CÔTÉ VÉTÉRINAIRE

### 1. Recevoir une demande

- Notification automatique quand un producteur demande un RDV
- Voir les détails dans le dashboard

### 2. Répondre à une demande

1. Ouvrir la notification ou aller dans le dashboard
2. Voir les détails du rendez-vous :
   - Producteur
   - Date et heure
   - Raison
   - Lieu
3. Choisir une action :
   - **Accepter** : Le producteur est notifié
   - **Refuser** : Indiquer une raison (requis), le producteur est notifié

### 3. Gérer ses rendez-vous

- Voir tous ses rendez-vous dans le dashboard
- Filtrer par statut
- Annuler un rendez-vous si nécessaire

---

## 🔔 NOTIFICATIONS

### Types de notifications

- `appointment_requested` - Demande de RDV reçue (vétérinaire)
- `appointment_accepted` - RDV accepté (producteur)
- `appointment_rejected` - RDV refusé (producteur)
- `appointment_cancelled` - RDV annulé (les deux)
- `appointment_reminder` - Rappel RDV (à implémenter)

---

## 📱 ENDPOINTS API

### Producteur

- `POST /appointments` - Créer une demande
- `GET /appointments?role=producer` - Liste des RDV
- `GET /appointments/upcoming?role=producer` - RDV à venir
- `GET /appointments/:id` - Détails d'un RDV
- `DELETE /appointments/:id/cancel` - Annuler un RDV

### Vétérinaire

- `GET /appointments?role=veterinarian` - Liste des RDV
- `GET /appointments/upcoming?role=veterinarian` - RDV à venir
- `GET /appointments/:id` - Détails d'un RDV
- `PATCH /appointments/:id` - Accepter/refuser
- `DELETE /appointments/:id/cancel` - Annuler un RDV

---

## 🛠️ COMPOSANTS FRONTEND

### Composants créés

1. **AppointmentRequestModal** - Modal de demande de RDV
2. **AppointmentCard** - Carte d'affichage d'un RDV
3. **AppointmentList** - Liste des RDV
4. **AppointmentDetailsModal** - Détails et actions (vétérinaire)

### Hooks

- **useAppointments** - Gestion des rendez-vous

### Services

- **appointmentService** - Appels API

---

## ⚠️ VALIDATIONS

### Côté producteur

- Date/heure doit être dans le futur
- Raison minimum 10 caractères
- Raison maximum 500 caractères
- Lieu maximum 200 caractères

### Côté vétérinaire

- Réponse optionnelle pour accepter
- Réponse requise pour refuser
- Réponse maximum 500 caractères

---

## 🚀 PROCHAINES AMÉLIORATIONS

- [ ] Widgets dashboard (producteur et vétérinaire)
- [ ] Système de rappels automatiques (cron job)
- [ ] Calendrier intégré
- [ ] Historique des RDV
- [ ] Statistiques (nombre de RDV, taux d'acceptation, etc.)
