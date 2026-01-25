# Plan de Refactorisation - Navigation Vétérinaire et Technicien

## 📋 Structure Actuelle

### Navigation actuelle pour vétérinaires :
- Dashboard (avec ProjectSelectorCollaborateur intégré)
- Collaboration
- Statistiques

### Accès aux projets :
- `ProjectSelectorCollaborateur` : composant dans le Dashboard pour sélectionner un projet
- Les écrans (Sante, Production, etc.) sont accessibles via navigation mais nécessitent un projet sélectionné

---

## 🎯 Structure Cible

### Navigation principale pour vétérinaires :
```
NAVIGATION PRINCIPALE
├─ Dashboard
│   └─ Vue d'ensemble (stats, rendez-vous, agenda)
├─ Mes Projets 👈 NOUVEAU
│   └─ Liste des projets accessibles
│       └─ Sélection d'un projet
│           └─ Menu du projet sélectionné :
│               ├─ Cheptel (lecture seule)
│               ├─ Mortalités (lecture seule)
│               ├─ Traitements (lecture seule)
│               ├─ Maladies (lecture seule)
│               ├─ Vaccinations (lecture seule)
│               ├─ Consultations (mes consultations) 👈 NOUVEAU
│               ├─ Rapports (mes rapports) 👈 NOUVEAU
│               └─ Traitements (mes traitements) 👈 NOUVEAU
├─ Collaboration
└─ Statistiques
```

---

## 📝 Fichiers à Créer/Modifier

### 1. Nouveaux écrans à créer

#### `src/screens/VetTechProjectsScreen.tsx` (NOUVEAU)
- **Rôle** : Écran principal "Mes Projets"
- **Fonctionnalités** :
  - Liste des projets accessibles (collaborations actives)
  - Sélection d'un projet
  - Navigation vers les sections du projet sélectionné
  - Affichage des permissions pour chaque projet

#### `src/screens/VetProjectDetailScreen.tsx` (NOUVEAU)
- **Rôle** : Hub de navigation pour un projet sélectionné
- **Fonctionnalités** :
  - Menu avec toutes les sections accessibles
  - Accès rapide : Cheptel, Mortalités, Traitements, Maladies, Vaccinations
  - Accès spécialisé : Consultations, Rapports, Traitements (mes actions)
  - Indicateur visuel des permissions

#### `src/screens/VetConsultationsScreen.tsx` (NOUVEAU ou améliorer ConsultationsScreen)
- **Rôle** : Gestion des consultations vétérinaires pour un projet
- **Fonctionnalités** :
  - Liste des consultations (passées, à venir, aujourd'hui)
  - Création d'une nouvelle consultation
  - Formulaire de consultation avec :
    - Motif
    - Diagnostic
    - Traitement prescrit
    - Prophylaxie (vaccins, vermifuges)
    - Pièce jointe PDF (rapport)
  - Historique des consultations

#### `src/screens/VetReportsScreen.tsx` (NOUVEAU)
- **Rôle** : Gestion des rapports vétérinaires
- **Fonctionnalités** :
  - Liste des rapports créés
  - Création d'un nouveau rapport
  - Upload de PDF
  - Association à une consultation

#### `src/screens/VetTreatmentsScreen.tsx` (NOUVEAU)
- **Rôle** : Gestion des traitements prescrits
- **Fonctionnalités** :
  - Liste des traitements prescrits
  - Suivi des traitements en cours
  - Historique

### 2. Fichiers de navigation à modifier

#### `src/navigation/types.ts`
- Ajouter :
  - `VET_TECH_PROJECTS: 'VetTechProjects'`
  - `VET_PROJECT_DETAIL: 'VetProjectDetail'`
  - `VET_CONSULTATIONS: 'VetConsultations'`
  - `VET_REPORTS: 'VetReports'`
  - `VET_TREATMENTS: 'VetTreatments'`

#### `src/navigation/AppNavigator.tsx`
- Ajouter le menu "Mes Projets" pour vétérinaires et techniciens
- Ajouter les écrans dans le Stack Navigator

#### `src/navigation/LazyScreens.tsx`
- Exporter les nouveaux écrans

### 3. Composants à créer

#### `src/components/vet/ProjectSectionsMenu.tsx` (NOUVEAU)
- **Rôle** : Menu des sections accessibles pour un projet
- **Affichage** : Grille de cartes cliquables
- **Sections** :
  - Cheptel (avec badge "lecture seule")
  - Mortalités (avec badge "lecture seule")
  - Traitements (avec badge "lecture seule")
  - Maladies (avec badge "lecture seule")
  - Vaccinations (avec badge "lecture seule")
  - Consultations (avec badge "mes consultations")
  - Rapports (avec badge "mes rapports")
  - Traitements (avec badge "mes traitements")

#### `src/components/vet/ConsultationFormModal.tsx` (NOUVEAU)
- **Rôle** : Formulaire de création/édition de consultation
- **Champs** :
  - Motif (obligatoire)
  - Diagnostic
  - Traitement prescrit
  - Prophylaxie (multi-select : vaccins, vermifuges)
  - Pièce jointe PDF (optionnel)
  - Date de consultation

### 4. Services/API à créer/modifier

#### `src/services/vetConsultationService.ts` (NOUVEAU)
- `createConsultation(projetId, consultationData)`
- `getConsultations(projetId)`
- `updateConsultation(consultationId, data)`
- `deleteConsultation(consultationId)`
- `attachReport(consultationId, pdfFile)`

#### Backend : `backend/src/consultations/` (NOUVEAU module)
- Controller, Service, DTOs pour les consultations vétérinaires
- Endpoints :
  - `POST /consultations` - Créer une consultation
  - `GET /consultations?projet_id=xxx` - Liste des consultations
  - `GET /consultations/:id` - Détails d'une consultation
  - `PATCH /consultations/:id` - Modifier une consultation
  - `DELETE /consultations/:id` - Supprimer une consultation
  - `POST /consultations/:id/report` - Attacher un rapport PDF

---

## 🔄 Scénario de Consultation Vétérinaire

### Flux utilisateur :

1. **Vétérinaire ouvre l'app**
   - Se connecte avec son profil vétérinaire
   - Voit le Dashboard avec vue d'ensemble

2. **Accès à "Mes Projets"**
   - Clique sur le menu "Mes Projets" dans la barre de navigation
   - Voit la liste de tous les projets où il est partie prenante
   - Sélectionne un projet (ex: "Ferme du Bonheur")

3. **Menu du projet sélectionné**
   - Voit le menu des sections accessibles
   - Peut accéder à :
     - Cheptel (lecture seule)
     - Mortalités, Traitements, Maladies, Vaccinations (lecture seule)
     - Consultations (ses consultations)
     - Rapports (ses rapports)
     - Traitements (ses traitements)

4. **Accès au Cheptel**
   - Clique sur "Cheptel"
   - Voit la liste des animaux selon le mode d'élevage :
     - Mode individuel : liste des animaux
     - Mode bande : liste des bandes/loges
   - Sélectionne un sujet ou une loge (ex: "Porc #42")

5. **Création d'une consultation**
   - Clique sur "Nouvelle consultation" depuis la fiche de l'animal
   - Ouvre le formulaire de consultation
   - Remplit :
     - Motif (ex: "Contrôle de routine")
     - Diagnostic (ex: "Animal en bonne santé")
     - Traitement prescrit (ex: "Aucun traitement nécessaire")
     - Prophylaxie :
       - Vaccin : Oui/Non
       - Vermifuge : Oui/Non
     - Pièce jointe PDF (optionnel) : Upload d'un rapport
   - Enregistre

6. **Système traite la consultation**
   - Enregistre la consultation dans la base de données
   - Met à jour l'historique médical de l'animal
   - Envoie une notification au producteur

7. **Producteur reçoit la notification**
   - Notification : "Nouvelle consultation pour Porc #42"
   - Peut voir la consultation dans :
     - Menu Santé > Vétérinaire > Historique des visites
     - Fiche de l'animal > Historique médical

---

## 🛠️ Implémentation - Étapes

### Phase 1 : Structure de navigation
1. ✅ Créer `VetTechProjectsScreen.tsx`
2. ✅ Créer `VetProjectDetailScreen.tsx`
3. ✅ Ajouter les routes dans `types.ts` et `AppNavigator.tsx`
4. ✅ Ajouter le menu "Mes Projets" dans la barre de navigation

### Phase 2 : Composants UI
1. ✅ Créer `ProjectSectionsMenu.tsx`
2. ✅ Améliorer `ProjectSelectorCollaborateur` pour réutilisation
3. ✅ Créer les cartes de navigation pour chaque section

### Phase 3 : Écran Consultations
1. ✅ Créer/améliorer `VetConsultationsScreen.tsx`
2. ✅ Créer `ConsultationFormModal.tsx`
3. ✅ Intégrer avec l'API backend

### Phase 4 : Écrans Rapports et Traitements
1. ✅ Créer `VetReportsScreen.tsx`
2. ✅ Créer `VetTreatmentsScreen.tsx`
3. ✅ Intégrer avec l'API backend

### Phase 5 : Backend
1. ✅ Créer le module `consultations` dans le backend
2. ✅ Créer les endpoints API
3. ✅ Gérer les permissions (vérifier que le vétérinaire a accès au projet)
4. ✅ Système de notifications

### Phase 6 : Intégration et tests
1. ✅ Tester le flux complet
2. ✅ Vérifier les permissions
3. ✅ Tester les notifications
4. ✅ Optimiser les performances

---

## 📊 Structure de données

### Consultation Vétérinaire
```typescript
interface VetConsultation {
  id: string;
  projet_id: string;
  animal_id?: string; // Mode individuel
  batch_id?: string; // Mode bande
  veterinaire_id: string;
  date_consultation: string;
  motif: string;
  diagnostic?: string;
  traitement_prescrit?: string;
  prophylaxie: {
    vaccin: boolean;
    vermifuge: boolean;
    autres?: string[];
  };
  rapport_pdf?: string; // URL du PDF
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

---

## 🔐 Gestion des Permissions

### Vérifications à effectuer :
1. Le vétérinaire a-t-il une collaboration active avec le projet ?
2. Le vétérinaire a-t-il la permission `permission_sante` ou `permission_gestion_complete` ?
3. Le projet est-il actif ?

### Accès en lecture seule :
- Cheptel, Mortalités, Traitements, Maladies, Vaccinations
- Le vétérinaire peut voir mais ne peut pas modifier

### Accès en écriture :
- Consultations : Le vétérinaire peut créer/modifier ses propres consultations
- Rapports : Le vétérinaire peut créer/modifier ses propres rapports
- Traitements : Le vétérinaire peut créer/modifier ses propres traitements

---

## 🎨 Design UI

### Écran "Mes Projets"
- Liste de cartes (une par projet)
- Chaque carte affiche :
  - Nom du projet
  - Localisation
  - Rôle du vétérinaire
  - Nombre d'animaux
  - Badge "Actif" si projet sélectionné
- Bouton "Sélectionner" ou navigation directe

### Écran "Détails du Projet"
- Header avec nom du projet et sélecteur
- Grille de cartes pour chaque section
- Badges visuels :
  - "Lecture seule" (gris)
  - "Mes consultations" (bleu)
  - "Mes rapports" (vert)
  - "Mes traitements" (orange)

---

## 📝 Notes importantes

1. **Compatibilité** : Conserver la navigation actuelle pour les producteurs
2. **Migration** : Les vétérinaires existants continueront de fonctionner avec l'ancien système pendant la transition
3. **Notifications** : Utiliser le système de notifications existant (`NotificationsService`)
4. **Permissions** : Réutiliser la logique existante dans `checkProjetOwnership`

---

**Date de création** : 2026-01-24  
**Statut** : Planification
