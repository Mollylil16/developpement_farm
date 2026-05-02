# Guide : Exporter SQLite vers PostgreSQL

## 🎯 Situation
- **Votre app** : Utilise SQLite (expo-sqlite) - fichier `fermier_pro.db`
- **Collaborateur** : Veut utiliser PostgreSQL
- **Objectif** : Exporter le schéma (et optionnellement les données) vers PostgreSQL

---

## 📋 Option 1 : Schéma Seulement (Déjà fait ✅)

Vous avez déjà le fichier `database/postgresql_schema.sql` qui contient uniquement la structure des tables.

**Avantages** :
- ✅ Déjà créé
- ✅ Léger
- ✅ Rapide à envoyer

**Inconvénients** :
- ❌ Pas de données (tables vides)

---

## 📋 Option 2 : Schéma + Données (Recommandé si vous avez des données)

### Étape 1 : Installer sqlite3 (si pas déjà fait)

**Windows (PowerShell)** :
```powershell
# Option 1 : Via npm (si Node.js installé)
npm install -g sqlite3

# Option 2 : Télécharger depuis https://www.sqlite.org/download.html
```

**Vérifier l'installation** :
```bash
sqlite3 --version
```

### Étape 2 : Trouver votre fichier SQLite

Le fichier SQLite est généralement dans :
- **Expo/React Native** : `%APPDATA%\Expo\expo-sqlite\` (Windows)
- Ou dans votre projet si vous l'avez exporté

**Chercher le fichier** :
```powershell
# Dans PowerShell
Get-ChildItem -Path $env:APPDATA\Expo -Recurse -Filter "*.db" | Select-Object FullName
```

### Étape 3 : Exporter le schéma SQL depuis SQLite

```bash
# Ouvrir SQLite
sqlite3 fermier_pro.db

# Exporter le schéma (structure seulement)
.output schema.sql
.schema

# Ou exporter avec les données (INSERT statements)
.output schema_with_data.sql
.dump

# Quitter
.quit
```

### Étape 4 : Convertir SQLite SQL vers PostgreSQL

Le SQL exporté de SQLite n'est pas directement compatible avec PostgreSQL. Il faut convertir :

**Problèmes à corriger** :
1. `TEXT` → `VARCHAR(255)` ou `TEXT`
2. `REAL` → `NUMERIC(10, 2)`
3. `INTEGER` → `INTEGER` (identique)
4. `CURRENT_TIMESTAMP` → `NOW()` ou `CURRENT_TIMESTAMP`
5. `AUTOINCREMENT` → `SERIAL` (si applicable)
6. Supprimer les `BEGIN TRANSACTION` / `COMMIT` (PostgreSQL les gère différemment)

---

## 📋 Option 3 : Utiliser un Outil de Migration (Plus Simple)

### Outil : pgloader (Recommandé)

**Installation** :
- **Windows** : Télécharger depuis https://github.com/dimitri/pgloader/releases
- **Linux/Mac** : `sudo apt install pgloader` ou `brew install pgloader`

**Utilisation** :
```bash
pgloader sqlite:///chemin/vers/fermier_pro.db postgresql://user:password@localhost/fermier_pro
```

**Avantages** :
- ✅ Conversion automatique des types
- ✅ Migration des données
- ✅ Gestion des contraintes

---

## 📋 Option 4 : Via pgAdmin (Si vous avez déjà PostgreSQL)

### Si vous avez déjà importé le schéma dans PostgreSQL :

1. **Ouvrir pgAdmin**
2. **Clic droit sur votre base** `fermier_pro`
3. **Backup...**
4. **Format** : Plain
5. **Filename** : `fermier_pro_backup.sql`
6. **Options** :
   - ✅ Only schema (si vous voulez juste le schéma)
   - ✅ Schema + Data (si vous voulez les données aussi)
7. **Backup**

Le fichier généré peut être envoyé à votre collaborateur.

---

## 🔧 Solution Rapide : Corriger le Fichier SQL Actuel

Si votre collaborateur a des erreurs, voici les corrections à faire :

### Problème 1 : Types de dates
**Avant** :
```sql
date_creation VARCHAR(255) DEFAULT NOW()
```

**Après** :
```sql
date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### Problème 2 : Ordre de création des tables
Les tables avec `FOREIGN KEY` doivent être créées **après** les tables référencées.

**Ordre correct** :
1. `users` (pas de FK)
2. `projets` (FK vers users)
3. `production_animaux` (FK vers projets)
4. `revenus` (FK vers projets, animaux)
5. etc.

### Problème 3 : Syntaxe CHECK
PostgreSQL est plus strict sur les CHECK constraints.

---

## ✅ Solution Recommandée

**Pour vous (maintenant)** :

1. **Créer un fichier SQL corrigé** avec le script que j'ai créé
2. **Tester localement** dans pgAdmin avant d'envoyer
3. **Envoyer le fichier corrigé**

**Pour votre collaborateur** :

1. Créer la base : `CREATE DATABASE fermier_pro;`
2. Exécuter le script SQL corrigé
3. Vérifier : `\dt` (liste les tables)

---

## 🐛 Erreurs Courantes et Solutions

### Erreur : "relation does not exist"
**Cause** : Table référencée n'existe pas encore
**Solution** : Vérifier l'ordre de création des tables

### Erreur : "syntax error at or near"
**Cause** : Syntaxe SQLite incompatible
**Solution** : Convertir les types et fonctions

### Erreur : "column does not exist"
**Cause** : Nom de colonne incorrect
**Solution** : Vérifier les noms dans le schéma original

---

## 📝 Checklist

- [ ] Fichier SQL généré
- [ ] Types de dates corrigés (VARCHAR → TIMESTAMP)
- [ ] Ordre des tables vérifié
- [ ] Testé localement dans pgAdmin
- [ ] Fichier envoyé au collaborateur
- [ ] Instructions fournies

---

## 💡 Astuce

Si vous voulez juste que votre collaborateur ait la **structure** (sans données), le fichier `postgresql_schema.sql` que vous avez déjà est suffisant, il faut juste le corriger pour les erreurs PostgreSQL.

