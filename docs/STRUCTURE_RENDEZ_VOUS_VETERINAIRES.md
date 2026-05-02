# 📋 Structure des fichiers - Système de Rendez-vous Vétérinaires

## 🎯 Vue d'ensemble
Système complet de prise de rendez-vous entre producteurs et vétérinaires avec notifications et rappels.

---

## 📁 BACKEND

### Migrations
```
backend/database/migrations/
  └── 091_create_vet_appointments_table.sql
```

### Module Appointments
```
backend/src/appointments/
  ├── appointments.module.ts          # Module NestJS
  ├── appointments.service.ts         # Logique métier
  ├── appointments.controller.ts      # Endpoints API
  └── dto/
      ├── create-appointment.dto.ts   # DTO création RDV
      ├── update-appointment.dto.ts   # DTO mise à jour RDV
      └── appointment-response.dto.ts # DTO réponse
```

---

## 📁 FRONTEND

### Types
```
src/types/
  └── appointment.ts                  # Types TypeScript pour RDV
```

### Services
```
src/services/
  └── appointmentService.ts           # Service API pour RDV
```

### Hooks
```
src/hooks/
  ├── useAppointments.ts              # Hook pour gérer les RDV
  └── useAppointmentNotifications.ts  # Hook pour notifications RDV
```

### Composants
```
src/components/
  ├── appointments/
  │   ├── AppointmentRequestModal.tsx      # Modal demande RDV
  │   ├── AppointmentCard.tsx              # Carte RDV
  │   ├── AppointmentList.tsx              # Liste des RDV
  │   ├── AppointmentDetailsModal.tsx      # Détails RDV (vétérinaire)
  │   └── AppointmentActions.tsx           # Actions (accepter/refuser)
  └── SearchVetModal.tsx                   # MODIFIÉ: Remplacer "Inviter" par "Demander RDV"
```

### Écrans/Dashboards
```
src/screens/
  └── AppointmentsScreen.tsx          # Écran dédié aux RDV (optionnel)

src/components/
  └── dashboard/
      ├── ProducerAppointmentsCard.tsx # Widget RDV pour producteur
      └── VetAppointmentsCard.tsx      # Widget RDV pour vétérinaire
```

---

## 🔄 FLUX DE DONNÉES

### 1. Producteur demande RDV
```
SearchVetModal → AppointmentRequestModal → API POST /appointments
  → Notification au vétérinaire
```

### 2. Vétérinaire répond
```
Dashboard → AppointmentDetailsModal → API PATCH /appointments/:id
  → Notification au producteur
```

### 3. Rappels
```
Backend Cron Job → Vérifie RDV du jour → Notifications push
```

---

## 📊 BASE DE DONNÉES

### Table: `vet_appointments`
- `id` (VARCHAR) - ID unique
- `producer_id` (VARCHAR) - ID producteur
- `vet_id` (VARCHAR) - ID vétérinaire
- `appointment_date` (TIMESTAMP) - Date/heure RDV
- `reason` (TEXT) - Raison du RDV
- `location` (TEXT) - Lieu d'intervention
- `status` (VARCHAR) - pending/accepted/rejected/cancelled/completed
- `vet_response` (TEXT) - Réponse du vétérinaire (optionnel)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `reminder_sent` (BOOLEAN) - Rappel envoyé

---

## 🔔 NOTIFICATIONS

### Types ajoutés à `marketplace_notifications`:
- `appointment_requested` - Demande de RDV reçue (vétérinaire)
- `appointment_accepted` - RDV accepté (producteur)
- `appointment_rejected` - RDV refusé (producteur)
- `appointment_reminder` - Rappel RDV (les deux)

---

## ✅ PROCHAINES ÉTAPES

1. ✅ Créer migration base de données
2. ✅ Créer module backend complet
3. ✅ Créer types et services frontend
4. ✅ Créer composants UI
5. ✅ Intégrer dans SearchVetModal
6. ✅ Ajouter widgets dashboard
7. ✅ Implémenter système de rappels
