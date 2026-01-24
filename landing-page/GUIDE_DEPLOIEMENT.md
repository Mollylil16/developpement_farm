# 🚀 Guide de Déploiement - Landing Page FarmtrackPro

## 📊 Architecture de Déploiement

### ⚠️ IMPORTANT : Deux Projets Séparés

La landing page et l'admin-web sont **deux projets complètement indépendants** :

```
┌─────────────────────────────────────────┐
│  farmtrackpro.com                      │
│  (Landing Page - Next.js)              │
│  → Déployé sur Vercel/Netlify/Render  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  admin.farmtrackpro.com                │
│  (Admin Dashboard - Vite + React)     │
│  → Déployé sur Render (existant)      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  api.farmtrackpro.com (ou backend)    │
│  (Backend NestJS)                      │
│  → Déployé sur Render (existant)      │
└─────────────────────────────────────────┘
```

## 🎯 Options de Déploiement

### Option 1 : Render (Recommandé si vous utilisez déjà Render)

#### Avantages :
- ✅ Même plateforme que votre backend/admin
- ✅ Facile à gérer
- ✅ SSL gratuit

#### Configuration :

1. **Créer un nouveau service Web sur Render**

2. **Configuration du service** :
   ```
   Name: farmtrackpro-landing
   Environment: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

3. **Variables d'environnement** :
   ```
   NEXT_PUBLIC_API_URL=https://votre-backend.onrender.com
   NODE_ENV=production
   ```

4. **Domaine personnalisé** :
   - Ajouter `farmtrackpro.com` (ou votre domaine)
   - Render génère automatiquement le SSL

#### Coût : **Gratuit** (avec limitations) ou **~7$/mois** (Starter)

---

### Option 2 : Vercel (Recommandé pour Next.js)

#### Avantages :
- ✅ Optimisé pour Next.js
- ✅ Déploiement automatique depuis GitHub
- ✅ CDN global
- ✅ Gratuit pour projets personnels

#### Configuration :

1. **Connecter votre repo GitHub à Vercel**

2. **Configuration automatique** :
   - Vercel détecte Next.js automatiquement
   - Build et déploiement automatiques

3. **Variables d'environnement** :
   ```
   NEXT_PUBLIC_API_URL=https://votre-backend.onrender.com
   ```

4. **Domaine personnalisé** :
   - Ajouter `farmtrackpro.com` dans Vercel
   - SSL automatique

#### Coût : **Gratuit** (plan Hobby)

---

### Option 3 : Netlify

#### Avantages :
- ✅ Facile à utiliser
- ✅ Déploiement continu
- ✅ Gratuit

#### Configuration :

1. **Connecter votre repo à Netlify**

2. **Build settings** :
   ```
   Build command: npm run build
   Publish directory: .next
   ```

3. **Variables d'environnement** :
   ```
   NEXT_PUBLIC_API_URL=https://votre-backend.onrender.com
   ```

#### Coût : **Gratuit** (plan Starter)

---

## 🔧 Configuration Requise

### 1. Variables d'Environnement

Créez un fichier `.env.production` ou configurez dans votre plateforme :

```env
NEXT_PUBLIC_API_URL=https://votre-backend.onrender.com
NODE_ENV=production
```

### 2. Build Command

```bash
npm install
npm run build
```

### 3. Start Command (pour Render)

```bash
npm start
```

---

## 📋 Checklist de Déploiement

### Avant le déploiement :
- [ ] Tester localement : `npm run dev`
- [ ] Vérifier que le build fonctionne : `npm run build`
- [ ] Configurer les variables d'environnement
- [ ] Mettre à jour les liens App Store/Play Store
- [ ] Vérifier que le backend est accessible

### Pendant le déploiement :
- [ ] Créer le service sur la plateforme choisie
- [ ] Connecter le repo GitHub
- [ ] Configurer les variables d'environnement
- [ ] Configurer le domaine personnalisé
- [ ] Vérifier que le build réussit

### Après le déploiement :
- [ ] Tester la landing page en production
- [ ] Vérifier que les appels API fonctionnent
- [ ] Tester sur mobile
- [ ] Vérifier le SEO (meta tags)
- [ ] Configurer Google Analytics (optionnel)

---

## 🌐 Configuration DNS

### Si vous utilisez deux domaines :

```
farmtrackpro.com          → Landing Page (Vercel/Netlify/Render)
admin.farmtrackpro.com    → Admin Dashboard (Render)
api.farmtrackpro.com      → Backend (Render) - optionnel
```

### Configuration DNS (exemple) :

```
Type    Name    Value
A       @       [IP de Vercel/Netlify/Render]
CNAME   admin   [URL Render de admin-web]
CNAME   api     [URL Render du backend]
```

---

## 🔗 Liens entre les Projets

### La landing page appelle :
- ✅ Backend API : `GET /api/public/*`
- ❌ Admin-web : **Aucun lien direct**

### L'admin-web :
- ✅ Appelle le backend API
- ❌ N'a pas besoin de la landing page

### Le backend :
- ✅ Sert les endpoints publics pour la landing page
- ✅ Sert les endpoints admin pour admin-web
- ✅ Sert les endpoints API pour l'app mobile

---

## 💡 Recommandation Finale

### Pour la Landing Page :
**Vercel** (gratuit, optimisé Next.js, déploiement automatique)

### Pour Admin-Web :
**Render** (déjà configuré, garder tel quel)

### Pour le Backend :
**Render** (déjà configuré, garder tel quel)

---

## 🚀 Déploiement Rapide sur Vercel

1. **Installer Vercel CLI** (optionnel) :
   ```bash
   npm i -g vercel
   ```

2. **Déployer** :
   ```bash
   cd fermier-pro/landing-page
   vercel
   ```

3. **Ou via l'interface web** :
   - Aller sur vercel.com
   - Connecter votre repo GitHub
   - Vercel détecte Next.js automatiquement
   - Ajouter les variables d'environnement
   - Déployer !

---

## ❓ Questions Fréquentes

### Q: Dois-je déployer landing-page et admin-web ensemble ?
**R:** Non, ce sont deux projets séparés. Déployez-les séparément.

### Q: Puis-je utiliser le même domaine ?
**R:** Oui, avec des sous-domaines :
- `farmtrackpro.com` → Landing page
- `admin.farmtrackpro.com` → Admin

### Q: Le backend doit-il être accessible publiquement ?
**R:** Oui, la landing page doit pouvoir appeler les endpoints `/api/public/*`

### Q: Combien ça coûte ?
**R:** 
- Vercel : Gratuit (plan Hobby)
- Netlify : Gratuit (plan Starter)
- Render : Gratuit (avec limitations) ou ~7$/mois

---

**Prêt à déployer ?** 🚀
