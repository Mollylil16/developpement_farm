# 🚀 Guide de Démarrage - Landing Page FarmtrackPro

## 📋 Prérequis

- Node.js 18+ installé
- npm ou yarn
- Backend FarmtrackPro en cours d'exécution (ou URL du backend déployé)

## 🔧 Installation

```bash
# 1. Aller dans le dossier landing-page
cd fermier-pro/landing-page

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local

# 4. Éditer .env.local et configurer l'URL du backend
# NEXT_PUBLIC_API_URL=http://localhost:3000
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

## 📊 Structure du Projet

```
landing-page/
├── src/
│   ├── app/                    # Pages Next.js (App Router)
│   │   ├── layout.tsx          # Layout principal
│   │   ├── page.tsx            # Page d'accueil
│   │   └── globals.css         # Styles globaux
│   ├── components/
│   │   ├── layout/             # Composants de layout
│   │   │   ├── Header.tsx      # En-tête avec navigation
│   │   │   └── Footer.tsx      # Pied de page
│   │   └── sections/           # Sections de la page
│   │       ├── Hero.tsx        # Section hero
│   │       ├── Stats.tsx       # Statistiques
│   │       ├── Features.tsx    # Fonctionnalités
│   │       ├── TopProducers.tsx # Meilleurs producteurs
│   │       ├── Testimonials.tsx # Témoignages
│   │       └── CTA.tsx         # Appel à l'action
│   └── lib/
│       └── api.ts              # Client API pour appels backend
```

## 🔗 Endpoints Backend Utilisés

La landing page utilise les endpoints publics suivants :

- `GET /api/public/stats` - Statistiques publiques
- `GET /api/public/producers/top?limit=6` - Meilleurs producteurs
- `GET /api/public/testimonials` - Témoignages

Ces endpoints sont **publiques** (pas d'authentification requise).

## 🎨 Personnalisation

### Couleurs

Les couleurs sont définies dans `tailwind.config.js` :

```javascript
colors: {
  brand: {
    500: '#465fff', // Couleur principale
    // ...
  }
}
```

### Contenu

- **Témoignages** : Modifiez `src/components/sections/Testimonials.tsx`
- **Fonctionnalités** : Modifiez `src/components/sections/Features.tsx`
- **Liens App Store/Play Store** : Modifiez les URLs dans `CTA.tsx` et `TopProducers.tsx`

## 📱 Responsive

La landing page est entièrement responsive :
- **Mobile** : < 768px
- **Tablette** : 768px - 1024px
- **Desktop** : > 1024px

## 🚀 Déploiement

### Vercel (Recommandé)

1. Connectez votre repo GitHub à Vercel
2. Configurez les variables d'environnement dans Vercel
3. Déployez automatiquement

### Netlify

1. Connectez votre repo GitHub à Netlify
2. Configurez les variables d'environnement
3. Build command : `npm run build`
4. Publish directory : `.next`

### Render

1. Créez un nouveau service Web
2. Connectez votre repo
3. Build command : `npm run build`
4. Start command : `npm start`

## 🔍 SEO

- Meta tags configurés dans `src/app/layout.tsx`
- Structure sémantique HTML
- Images optimisées avec Next.js Image

## 🐛 Dépannage

### Erreur : "Cannot find module"

```bash
# Supprimer node_modules et réinstaller
rm -rf node_modules package-lock.json
npm install
```

### Erreur : "API URL not found"

Vérifiez que `NEXT_PUBLIC_API_URL` est bien configuré dans `.env.local`

### Les données ne se chargent pas

1. Vérifiez que le backend est en cours d'exécution
2. Vérifiez les endpoints dans la console du navigateur
3. Vérifiez les CORS dans le backend

## 📞 Support

Pour toute question, contactez l'équipe de développement.
