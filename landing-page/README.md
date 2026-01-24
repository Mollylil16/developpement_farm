# 🌐 FarmtrackPro - Landing Page

Landing page publique pour présenter l'application FarmtrackPro et encourager les téléchargements.

## 🚀 Installation

```bash
cd landing-page
npm install
```

## 📋 Configuration

1. Créez un fichier `.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 🏃 Démarrage

### Mode développement
```bash
npm run dev
```

La landing page sera accessible sur **http://localhost:3000**

### Build production
```bash
npm run build
npm start
```

## 📊 Fonctionnalités

### ✅ Sections implémentées
- **Hero** : Section d'accueil avec CTA
- **Stats** : Statistiques en temps réel
- **Features** : Présentation des fonctionnalités
- **Top Producers** : Liste des meilleurs producteurs
- **Testimonials** : Témoignages utilisateurs
- **CTA** : Appel à l'action pour téléchargement
- **Footer** : Pied de page avec liens

### 🔗 Intégration Backend
- Endpoints publics pour récupérer les données
- Statistiques dynamiques
- Liste des meilleurs producteurs

## 🛠️ Technologies

- **Next.js 14** - Framework React
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Axios** - Appels API
- **Lucide React** - Icônes

## 📱 Responsive

La landing page est entièrement responsive et fonctionne sur :
- Desktop
- Tablette
- Mobile

## 🔗 Liens

- Play Store : À configurer
- App Store : À configurer
- Admin : `/admin` (redirige vers admin.farmtrackpro.com)
