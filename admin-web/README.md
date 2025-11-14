# 🐷 Fermier Pro - Interface Web d'Administration

Interface web complète pour gérer toutes les données de l'application Fermier Pro, similaire à Prisma Studio.

## 🚀 Installation

```bash
cd admin-web
npm install
```

## 📋 Démarrage

```bash
npm start
```

L'interface sera accessible sur **http://localhost:3001**

## ✨ Fonctionnalités

- ✅ **Visualisation de toutes les tables** de la base de données
- ✅ **CRUD complet** (Créer, Lire, Modifier, Supprimer) sur toutes les données
- ✅ **Recherche** dans les tables
- ✅ **Pagination** pour les grandes tables
- ✅ **Statistiques** de la base de données
- ✅ **Interface moderne** avec thème sombre
- ✅ **Gestion complète** : utilisateurs, projets, collaborateurs, gestations, stocks, finances, etc.

## 📊 Tables disponibles

- `users` - Utilisateurs
- `projets` - Projets
- `collaborations` - Collaborateurs
- `gestations` - Gestations
- `sevrages` - Sevrages
- `production_animaux` - Animaux du cheptel
- `production_pesees` - Pesées
- `mortalites` - Mortalités
- `stocks_aliments` - Stocks d'aliments
- `stocks_mouvements` - Mouvements de stock
- `rations` - Rations
- `ingredients` - Ingrédients
- `depenses_ponctuelles` - Dépenses
- `revenus` - Revenus
- `charges_fixes` - Charges fixes
- `planifications` - Tâches planifiées
- Et toutes les autres tables de l'application

## 🔧 Configuration

Le serveur cherche automatiquement la base de données SQLite aux emplacements suivants :

- **Windows**: `%USERPROFILE%\.expo\fermier_pro.db`
- **macOS**: `~/Library/Application Support/expo/fermier_pro.db`
- **Linux**: `~/.expo/fermier_pro.db`

Si la base de données n'est pas trouvée, créez d'abord un projet dans l'application mobile pour l'initialiser.

## 🛠️ Développement

Pour le développement avec rechargement automatique :

```bash
npm run dev
```

(Requiert `nodemon` installé globalement ou en devDependencies)

## 📝 Notes

- Le serveur lit directement le fichier SQLite de l'application
- Toutes les modifications sont effectuées en temps réel
- L'interface est responsive et fonctionne sur desktop et tablette
- Les requêtes SQL personnalisées (SELECT uniquement) peuvent être exécutées via l'API

## 🔒 Sécurité

⚠️ **Important**: Cette interface est destinée au développement et à l'administration locale uniquement. Ne l'exposez pas sur Internet sans authentification appropriée.

## 🔮 Évolution future

Cette interface admin est conçue pour fonctionner avec SQLite localement. Lors de la migration vers un backend distant avec PostgreSQL (voir `ARCHITECTURE_FUTURE.md`), l'interface pourra être adaptée pour se connecter à l'API backend au lieu de lire directement la base de données.

**Migration prévue:**
- Phase actuelle: SQLite local (MVP)
- Phase future: Backend API + PostgreSQL (Production)
- L'interface admin pourra être adaptée pour utiliser l'API REST au lieu de SQLite direct

