# Script d'Importation de la Base de Connaissances

Ce script permet d'importer automatiquement les fichiers Markdown de la base de connaissances dans la base de données PostgreSQL.

## Prérequis

1. **Base de données PostgreSQL** configurée et accessible
2. **Table `knowledge_base`** créée (migration `051_create_knowledge_base_table.sql`)
3. **Variables d'environnement** configurées (`.env` ou variables système)

## Variables d'Environnement Requises

```env
# Option 1: DATABASE_URL (recommandé pour production)
DATABASE_URL=postgresql://user:password@host:port/database

# Option 2: Variables individuelles (développement)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=farmtrack_db
DB_USER=farmtrack_user
DB_PASSWORD=postgres
DB_SSL=false
```

## Utilisation

### Méthode 1: Via npm script (recommandé)

```bash
cd backend
npm run import:knowledge-base
```

### Méthode 2: Directement avec tsx

```bash
cd backend
npx tsx scripts/import-knowledge-base.ts
```

## Fonctionnement

Le script :

1. **Lit les fichiers Markdown** dans `src/services/chatAgent/knowledge/markdown/`
2. **Parse chaque fichier** pour extraire :
   - Titre (première ligne `#`)
   - Catégorie (ligne `**Catégorie:**`)
   - Mots-clés (ligne `**Mots-clés:**`)
   - Contenu complet
   - Résumé automatique (premières 200 caractères)
   - Priorité (basée sur le numéro du fichier)
3. **Vérifie les doublons** (par titre)
4. **Insère ou met à jour** dans la base de données

## Fichiers Traités

Le script traite tous les fichiers `.md` sauf `README.md` :
- `01-introduction-bonnes-pratiques.md`
- `02-nutrition-alimentation.md`
- `03-gestion-reproductivite.md`
- `04-croissance-engraissement.md`
- `05-hygiene-biosécurité.md`
- `06-sante-maladies.md`
- `07-identification-suivi.md`
- `08-gestion-economique.md`
- `09-astuces-conseils.md`
- `10-ressources-contacts.md`

## Résultat

Le script affiche :
- ✅ Fichiers parsés avec succès
- ✅ Contenus créés
- 🔄 Contenus mis à jour
- ❌ Erreurs éventuelles
- 📊 Résumé final

## Gestion des Doublons

Si un contenu avec le même titre existe déjà :
- **Mise à jour** : Le contenu existant est mis à jour
- **Création** : Un nouveau contenu est créé si le titre est différent

## Dépannage

### Erreur de connexion à la base de données

Vérifier :
- Les variables d'environnement sont correctes
- PostgreSQL est démarré
- Les permissions de connexion

### Fichiers non trouvés

Vérifier que les fichiers Markdown sont bien dans :
`src/services/chatAgent/knowledge/markdown/`

### Erreurs de parsing

Vérifier le format des fichiers Markdown :
- Titre doit commencer par `#`
- Catégorie doit être sur une ligne `**Catégorie:** \`category\``
- Mots-clés doivent être sur une ligne `**Mots-clés:** mot1, mot2, ...`

## Exemple de Sortie

```
🚀 Démarrage de l'importation de la base de connaissances...

📁 10 fichier(s) Markdown trouvé(s)

✅ Parsé: 1. Introduction et Bonnes Pratiques Générales (general)
✅ Parsé: 2. Nutrition et Alimentation (alimentation)
...
📊 10 fichier(s) valide(s) à importer

✅ Connexion à la base de données établie

✅ Créé: 1. Introduction et Bonnes Pratiques Générales
✅ Créé: 2. Nutrition et Alimentation
...

📈 Résumé de l'importation:
   ✅ Créés: 10
   🔄 Mis à jour: 0
   ❌ Erreurs: 0
   📊 Total: 10

🎉 Importation terminée avec succès !
```

