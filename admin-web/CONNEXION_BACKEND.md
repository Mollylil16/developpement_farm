# 🔗 Connexion Admin-Web ↔ Backend

## ✅ État de la Connexion

**Status : CONNECTÉ ET FONCTIONNEL** ✅

---

## 📡 Configuration API

### Frontend (admin-web)
- **Fichier** : `src/services/api.ts`
- **Base URL** : `http://localhost:3000` (par défaut)
- **Variable d'environnement** : `VITE_API_URL` (optionnelle)
- **Authentification** : Token JWT stocké dans `localStorage` (`admin_token`)
- **Intercepteurs** :
  - ✅ Ajout automatique du token `Authorization: Bearer {token}`
  - ✅ Gestion des erreurs 401 (redirection vers `/login`)

### Backend
- **Port** : `3000` (par défaut)
- **CORS** : Configuré pour autoriser `http://localhost:5173` (Vite dev server)
- **Authentification** : `AdminAuthGuard` pour toutes les routes `/admin/*`
- **Headers autorisés** : `Content-Type`, `Authorization`, `Accept`

---

## 🔌 Endpoints Connectés

### ✅ Dashboard
- **Frontend** : `adminApi.getDashboardStats(period)`
- **Backend** : `GET /admin/dashboard/stats?period={period}`
- **Status** : ✅ Connecté

### ✅ Finance
- **Frontend** : `adminApi.getFinanceStats(period)`
- **Backend** : `GET /admin/finance/stats?period={period}`
- **Frontend** : `adminApi.getTransactions(params)`
- **Backend** : `GET /admin/finance/transactions?{params}`
- **Status** : ✅ Connecté

### ✅ Users
- **Frontend** : `adminApi.getUsersWithSubscriptions(params)`
- **Backend** : `GET /admin/users/subscriptions?{params}`
- **Frontend** : `adminApi.getUserDetail(userId)`
- **Backend** : `GET /admin/users/:userId`
- **Frontend** : `adminApi.updateUserStatus(userId, isActive)`
- **Backend** : `PUT /admin/users/:userId/status`
- **Status** : ✅ Connecté

### ✅ Projects
- **Frontend** : `adminApi.getProjects(params)`
- **Backend** : `GET /admin/projects?{params}`
- **Status** : ✅ Connecté

### ✅ Validation Vétérinaires
- **Frontend** : `adminApi.getVeterinariansForValidation(params)`
- **Backend** : `GET /admin/users/veterinarians?{params}`
- **Frontend** : `adminApi.approveVeterinarian(userId, reason)`
- **Backend** : `POST /admin/users/veterinarians/:userId/approve`
- **Frontend** : `adminApi.rejectVeterinarian(userId, reason)`
- **Backend** : `POST /admin/users/veterinarians/:userId/reject`
- **Frontend** : `adminApi.getVeterinarianDocuments(userId)`
- **Backend** : `GET /admin/users/veterinarians/:userId/documents`
- **Status** : ✅ Connecté

### ✅ Communication
- **Frontend** : `adminApi.sendMessage(data)`
- **Backend** : `POST /admin/messages/send`
- **Frontend** : `adminApi.getMessages(page, limit)`
- **Backend** : `GET /admin/messages?page={page}&limit={limit}`
- **Frontend** : `adminApi.congratulateActiveUsers(data)`
- **Backend** : `POST /admin/users/congratulate`
- **Status** : ✅ Connecté

### ✅ Promotions
- **Frontend** : `adminApi.createPromotion(data)`
- **Backend** : `POST /admin/promotions`
- **Frontend** : `adminApi.getPromotions(page, limit, filters)`
- **Backend** : `GET /admin/promotions?{params}`
- **Frontend** : `adminApi.updatePromotionStatus(id, isActive)`
- **Backend** : `PUT /admin/promotions/:id/status`
- **Status** : ✅ Connecté

### ✅ Données Agricoles (20 types)
Tous les endpoints sont dans `AgricoleController` avec le préfixe `/admin/agricole/` :

#### 1. Performances
- **Frontend** : `adminApi.getPerformancesData(period)`
- **Backend** : `GET /admin/agricole/performances?period={period}`
- **Status** : ✅ Connecté

#### 2. Santé
- **Frontend** : `adminApi.getSanteData(period)`
- **Backend** : `GET /admin/agricole/sante?period={period}`
- **Status** : ✅ Connecté

#### 3. Reproduction
- **Frontend** : `adminApi.getReproductionData()`
- **Backend** : `GET /admin/agricole/reproduction`
- **Status** : ✅ Connecté

#### 4. Nutrition
- **Frontend** : `adminApi.getNutritionData()`
- **Backend** : `GET /admin/agricole/nutrition`
- **Status** : ✅ Connecté

#### 5. Vaccination
- **Frontend** : `adminApi.getVaccinationData()`
- **Backend** : `GET /admin/agricole/vaccination`
- **Status** : ✅ Connecté

#### 6. Traçabilité
- **Frontend** : `adminApi.getTracabiliteData()`
- **Backend** : `GET /admin/agricole/tracabilite`
- **Status** : ✅ Connecté

#### 7. Économie
- **Frontend** : `adminApi.getEconomieData()`
- **Backend** : `GET /admin/agricole/economie`
- **Status** : ✅ Connecté

#### 8. Cartographie
- **Frontend** : `adminApi.getCartographieData()`
- **Backend** : `GET /admin/agricole/cartographie`
- **Status** : ✅ Connecté

#### 9. Certifications
- **Frontend** : `adminApi.getCertificationsData()`
- **Backend** : `GET /admin/agricole/certifications`
- **Status** : ✅ Connecté

---

## 🔄 Flux de Données Dynamiques

### 1. Authentification
```
Login → POST /admin/auth/login
  ↓
Token stocké dans localStorage
  ↓
Toutes les requêtes incluent: Authorization: Bearer {token}
```

### 2. Chargement des Données
```
Page charge → useQuery() → adminApi.method()
  ↓
Requête HTTP avec token
  ↓
Backend vérifie AdminAuthGuard
  ↓
Retourne les données depuis PostgreSQL
  ↓
Frontend affiche les données dynamiquement
```

### 3. Mise à Jour en Temps Réel
- **React Query** : Cache automatique + refetch
- **Invalidation** : Les mutations invalident les caches
- **Optimistic Updates** : Mises à jour immédiates de l'UI

---

## 🎯 Pages Dynamiques

### ✅ Dashboard
- Statistiques en temps réel
- Graphiques avec données réelles
- Métriques calculées depuis la BD

### ✅ Finance
- Transactions dynamiques
- Graphiques de revenus
- Statistiques financières

### ✅ Users
- Liste des utilisateurs avec abonnements
- Filtres et recherche
- Actions (activer/désactiver)

### ✅ Projects
- Liste des projets
- Filtres par statut
- Recherche

### ✅ Validation
- Liste des vétérinaires en attente
- Documents (CNI, diplômes)
- Actions (approuver/rejeter)

### ✅ Communication
- Envoi de messages
- Historique
- Félicitations

### ✅ Promotions
- Création de promotions
- Liste avec filtres
- Activation/désactivation

### ✅ Pages Data (9 pages)
Toutes les pages Data sont **100% dynamiques** :
- ✅ Performances
- ✅ Santé
- ✅ Reproduction
- ✅ Nutrition
- ✅ Vaccination
- ✅ Traçabilité
- ✅ Économie
- ✅ Cartographie
- ✅ Certifications

Chaque page :
- Charge les données depuis le backend
- Affiche des graphiques interactifs
- Permet la recherche, tri, pagination
- Export CSV disponible

---

## 🔧 Configuration Requise

### Frontend (.env ou variables)
```env
VITE_API_URL=http://localhost:3000
```

### Backend (.env)
```env
PORT=3000
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
NODE_ENV=development
```

---

## ✅ Vérifications

### ✅ CORS
- Backend autorise `http://localhost:5173`
- Headers CORS configurés correctement
- Credentials activés

### ✅ Authentification
- Token JWT fonctionnel
- AdminAuthGuard protège toutes les routes
- Redirection automatique si non authentifié

### ✅ Endpoints
- Tous les endpoints frontend ont leur correspondant backend
- Routes bien ordonnées (spécifiques avant génériques)
- Paramètres de requête supportés

### ✅ Données
- Toutes les pages utilisent `useQuery` pour charger les données
- Gestion des états (loading, error, success)
- Affichage conditionnel selon les données

---

## 📊 Résumé

| Composant | Status | Détails |
|-----------|--------|---------|
| **Connexion API** | ✅ | Axios configuré avec baseURL |
| **Authentification** | ✅ | JWT avec intercepteurs |
| **CORS** | ✅ | Configuré pour localhost:5173 |
| **Endpoints Dashboard** | ✅ | 100% connectés |
| **Endpoints Finance** | ✅ | 100% connectés |
| **Endpoints Users** | ✅ | 100% connectés |
| **Endpoints Projects** | ✅ | 100% connectés |
| **Endpoints Validation** | ✅ | 100% connectés |
| **Endpoints Communication** | ✅ | 100% connectés |
| **Endpoints Promotions** | ✅ | 100% connectés |
| **Endpoints Agricoles (9)** | ✅ | 100% connectés |
| **Pages Dynamiques** | ✅ | Toutes les pages chargent des données réelles |
| **Graphiques** | ✅ | Données depuis le backend |
| **Interactivité** | ✅ | Recherche, tri, pagination, export |

---

## 🎉 Conclusion

**Admin-web est 100% connecté au backend et entièrement dynamique !**

Toutes les données affichées proviennent de la base de données PostgreSQL via les endpoints NestJS. Aucune donnée statique ou mockée.
