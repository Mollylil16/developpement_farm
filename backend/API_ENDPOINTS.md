# 📡 API ENDPOINTS - FarmTrack Backend

## Base URL
```
http://localhost:3000
```

---

## 🔍 Health Check

### GET /health
Vérifie la santé de l'API et la connexion PostgreSQL
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

## 👥 Users (Utilisateurs)

### POST /users
Créer un utilisateur
```json
{
  "email": "user@example.com",
  "telephone": "+225123456789",
  "nom": "Doe",
  "prenom": "John",
  "password_hash": "...",
  "provider": "email"
}
```

### GET /users
Liste tous les utilisateurs

### GET /users/:id
Obtenir un utilisateur par ID

### PATCH /users/:id
Mettre à jour un utilisateur

### DELETE /users/:id
Supprimer un utilisateur

---

## 🏢 Projets

### POST /projets
Créer un projet
```json
{
  "nom": "Ferme ABC",
  "description": "Description",
  "localisation": "Abidjan",
  "nombre_truies": 10,
  "nombre_verrats": 2,
  "nombre_porcelets": 50,
  "poids_moyen_actuel": 25.5,
  "age_moyen_actuel": 120,
  "proprietaire_id": "user-id"
}
```

### GET /projets
Liste tous les projets
- Query: `?proprietaire_id=xxx` - Filtrer par propriétaire

### GET /projets/:id
Obtenir un projet par ID

### PATCH /projets/:id
Mettre à jour un projet

### DELETE /projets/:id
Supprimer un projet

---

## 💰 Finance

### Charges Fixes

#### POST /charges-fixes
Créer une charge fixe

#### GET /charges-fixes?projet_id=xxx
Liste des charges fixes d'un projet

#### GET /charges-fixes/:id
Obtenir une charge fixe

#### PATCH /charges-fixes/:id
Mettre à jour

#### DELETE /charges-fixes/:id
Supprimer

### Dépenses Ponctuelles

#### POST /depenses
Créer une dépense

#### GET /depenses?projet_id=xxx
Liste des dépenses

#### GET /depenses/:id
Obtenir une dépense

#### PATCH /depenses/:id
Mettre à jour

#### DELETE /depenses/:id
Supprimer

### Revenus

#### POST /revenus
Créer un revenu

#### GET /revenus?projet_id=xxx
Liste des revenus

#### GET /revenus/:id
Obtenir un revenu

#### PATCH /revenus/:id
Mettre à jour

#### DELETE /revenus/:id
Supprimer

---

## 🐷 Reproduction

### Gestations

#### POST /gestations
Créer une gestation

#### GET /gestations?projet_id=xxx
Liste des gestations

#### GET /gestations/:id
Obtenir une gestation

#### PATCH /gestations/:id
Mettre à jour

#### DELETE /gestations/:id
Supprimer

### Sevrages

#### POST /sevrages
Créer un sevrage

#### GET /sevrages?projet_id=xxx&gestation_id=xxx
Liste des sevrages

#### GET /sevrages/:id
Obtenir un sevrage

#### PATCH /sevrages/:id
Mettre à jour

#### DELETE /sevrages/:id
Supprimer

---

## 🐖 Production

### Animaux

#### POST /animaux
Créer un animal

#### GET /animaux?projet_id=xxx
Liste des animaux

#### GET /animaux/:id
Obtenir un animal

#### PATCH /animaux/:id
Mettre à jour

#### DELETE /animaux/:id
Supprimer

### Pesées

#### POST /pesees
Créer une pesée

#### GET /pesees?projet_id=xxx&animal_id=xxx
Liste des pesées

#### GET /pesees/:id
Obtenir une pesée

#### PATCH /pesees/:id
Mettre à jour

#### DELETE /pesees/:id
Supprimer

---

## 🏥 Santé

### Vaccinations

#### POST /vaccinations
Créer une vaccination

#### GET /vaccinations?projet_id=xxx
Liste des vaccinations

#### GET /vaccinations/:id
Obtenir une vaccination

#### PATCH /vaccinations/:id
Mettre à jour

#### DELETE /vaccinations/:id
Supprimer

### Maladies

#### POST /maladies
Créer une maladie

#### GET /maladies?projet_id=xxx
Liste des maladies

#### GET /maladies/:id
Obtenir une maladie

#### PATCH /maladies/:id
Mettre à jour

#### DELETE /maladies/:id
Supprimer

### Traitements

#### POST /traitements
Créer un traitement

#### GET /traitements?projet_id=xxx
Liste des traitements

#### GET /traitements/:id
Obtenir un traitement

#### PATCH /traitements/:id
Mettre à jour

#### DELETE /traitements/:id
Supprimer

### Visites Vétérinaires

#### POST /visites-veterinaires
Créer une visite

#### GET /visites-veterinaires?projet_id=xxx
Liste des visites

#### GET /visites-veterinaires/:id
Obtenir une visite

#### PATCH /visites-veterinaires/:id
Mettre à jour

#### DELETE /visites-veterinaires/:id
Supprimer

---

## 🥗 Nutrition

### Ingrédients

#### POST /ingredients
Créer un ingrédient

#### GET /ingredients
Liste tous les ingrédients

#### GET /ingredients/:id
Obtenir un ingrédient

#### PATCH /ingredients/:id
Mettre à jour

#### DELETE /ingredients/:id
Supprimer

### Stocks Aliments

#### POST /stocks/aliments
Créer un stock

#### GET /stocks/aliments?projet_id=xxx
Liste des stocks

#### GET /stocks/aliments/:id
Obtenir un stock

#### PATCH /stocks/aliments/:id
Mettre à jour

#### DELETE /stocks/aliments/:id
Supprimer

### Stocks Mouvements

#### POST /stocks/mouvements
Créer un mouvement de stock

#### GET /stocks/mouvements?projet_id=xxx&aliment_id=xxx
Liste des mouvements

#### GET /stocks/mouvements/:id
Obtenir un mouvement

#### DELETE /stocks/mouvements/:id
Supprimer

---

## 👥 Collaborations

#### POST /collaborations
Créer une collaboration

#### GET /collaborations?projet_id=xxx
Liste des collaborations

#### GET /collaborations/:id
Obtenir une collaboration

#### PATCH /collaborations/:id
Mettre à jour

#### DELETE /collaborations/:id
Supprimer

---

## 📅 Planifications

#### POST /planifications
Créer une planification

#### GET /planifications?projet_id=xxx
Liste des planifications

#### GET /planifications/:id
Obtenir une planification

#### PATCH /planifications/:id
Mettre à jour

#### DELETE /planifications/:id
Supprimer

---

## 💀 Mortalités

#### POST /mortalites
Créer une mortalité

#### GET /mortalites?projet_id=xxx
Liste des mortalités

#### GET /mortalites/:id
Obtenir une mortalité

#### PATCH /mortalites/:id
Mettre à jour

#### DELETE /mortalites/:id
Supprimer

---

## 📊 Résumé

**Total de modules**: 10
**Total d'endpoints**: ~50+ endpoints REST

Tous les endpoints suivent le pattern REST standard :
- `POST` - Créer
- `GET` - Lire (liste ou détail)
- `PATCH` - Mettre à jour
- `DELETE` - Supprimer

