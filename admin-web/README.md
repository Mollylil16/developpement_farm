# 🐷 FarmtrackPro - Dashboard Administrateur

Dashboard web complet pour administrer l'application FarmtrackPro.

## 🚀 Installation

```bash
cd admin-web
npm install
```

## 📋 Configuration

1. Copiez `.env.example` vers `.env` :
```bash
cp .env.example .env
```

2. Configurez l'URL du backend dans `.env` :
```env
VITE_API_URL=http://localhost:3000
```

## 🏃 Démarrage

### Mode développement
```bash
npm run dev
```

Le dashboard sera accessible sur **http://localhost:5173**

### Build production
```bash
npm run build
```

Les fichiers seront générés dans le dossier `dist/`.

## 📊 Fonctionnalités

### ✅ Dashboard principal
- Métriques SaaS (MRR, ARR, Churn Rate)
- Statistiques utilisateurs, projets, animaux
- Graphiques d'évolution des revenus
- Vue d'ensemble complète

### 💰 Finance SaaS
- Revenus par période (jour/semaine/mois)
- Transactions détaillées
- Revenus par plan d'abonnement
- Revenus par méthode de paiement

### 👥 Utilisateurs & Abonnements
- Liste des utilisateurs avec leurs abonnements
- Filtres par statut d'abonnement
- Gestion des plans

### 📁 Projets
- Liste des projets actifs
- Statistiques par projet

## 🔐 Authentification

Le dashboard utilise un système d'authentification séparé pour les administrateurs.

**Endpoints backend :**
- `POST /admin/auth/login` - Connexion admin
- `GET /admin/profile` - Profil admin
- `GET /admin/dashboard/stats` - Statistiques dashboard
- `GET /admin/finance/stats` - Statistiques financières
- `GET /admin/finance/transactions` - Liste des transactions
- `GET /admin/users/subscriptions` - Utilisateurs avec abonnements

## 🛠️ Technologies

- **React 18** + **TypeScript**
- **Vite** - Build tool ultra-rapide
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **React Query** - Gestion des données serveur
- **Recharts** - Graphiques
- **Axios** - Appels API
- **React Hot Toast** - Notifications

## 📱 Responsive

Le dashboard est entièrement responsive et fonctionne sur :
- Desktop
- Tablette
- Mobile

## 🔒 Sécurité

- Authentification JWT pour les admins
- Tokens stockés dans localStorage
- Redirection automatique si non authentifié
- Protection des routes admin
