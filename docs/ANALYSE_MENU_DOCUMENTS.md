# Analyse du Menu "Mes Documents"

## État Actuel

### Frontend (`src/screens/DocumentsScreen.tsx`)

Le menu "Mes documents" existe dans l'application mais **n'est pas encore fonctionnellement implémenté**.

#### Structure du Code

1. **Interface Document définie** (lignes 17-25) :
   ```typescript
   interface Document {
     id: string;
     name: string;
     category: DocumentCategory; // 'certificats' | 'factures' | 'photos' | 'autres'
     type: 'image' | 'pdf' | 'other';
     uri: string;
     createdAt: string;
     size?: number;
   }
   ```

2. **Catégories prévues** (lignes 57-63) :
   - **Tous** : Tous les documents
   - **Certificats** : Certificats sanitaires, documents officiels
   - **Factures** : Factures de vente, d'achat
   - **Photos** : Photos d'animaux, installations
   - **Autres** : Documents divers

3. **État actuel** :
   - ❌ **Le chargement des documents n'est pas implémenté** (lignes 37-50)
   - ⚠️ **TODO présent dans le code** : `// TODO: Implémenter le chargement des documents depuis la base de données`
   - ⚠️ **Simulation vide** : `setDocuments([])` - retourne un tableau vide
   - ❌ **L'ouverture des documents n'est pas implémentée** (lignes 141-147)

#### Navigation

- Accessible via : Menu Profil → "Mes documents" → `SCREENS.DOCUMENTS` → `DocumentsScreen`
- Écran chargé en lazy loading (écran secondaire)

---

## Ce Qui Devrait Être Stocké

Basé sur la structure de l'interface et les catégories prévues, le menu devrait contenir :

### 1. Certificats
- Certificats sanitaires des animaux
- Certificats de traçabilité
- Certificats vétérinaires
- Documents officiels d'élevage

### 2. Factures
- Factures de vente d'animaux (liées aux revenus)
- Factures d'achat (liées aux dépenses)
- Reçus de transactions

### 3. Photos
- Photos d'animaux (actuellement stockées dans `production_animaux.photo`)
- Photos d'installations
- Photos de visites vétérinaires (potentiellement liées à `visites_veterinaires`)

### 4. Autres
- Documents PDF générés (rapports, exports)
- Documents divers uploadés par l'utilisateur

---

## Documents Actuellement Stockés dans la Base de Données

### ✅ Photos d'animaux
- **Table** : `production_animaux`
- **Colonne** : `photo` (URI/URL de l'image)
- **Accès** : Via le module Production

### ✅ Photos de vaccins
- **Table** : `vaccinations`
- **Colonne** : `photo_flacon` (photo du flacon de vaccin)
- **Accès** : Via le module Santé → Vaccinations

### ✅ Autres données liées
- **Visites vétérinaires** : Table `visites_veterinaires` (pas de colonne photo identifiée)
- **Revenus/Ventes** : Table `revenus` (pas de colonne document identifiée)
- **Dépenses** : Table `depenses_ponctuelles` (pas de colonne facture identifiée)

---

## Ce Qui Manque pour Rendre le Menu Fonctionnel

### 1. Backend

#### Table de Documents
Aucune table dédiée aux documents n'existe actuellement. Il faudrait créer :

```sql
CREATE TABLE documents (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  projet_id VARCHAR(255), -- Optionnel, certains documents peuvent être au niveau utilisateur
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('certificats', 'factures', 'photos', 'autres')),
  type VARCHAR(20) NOT NULL CHECK (type IN ('image', 'pdf', 'other')),
  uri TEXT NOT NULL, -- URI/URL du document
  size INTEGER, -- Taille en bytes
  description TEXT,
  metadata JSONB, -- Métadonnées supplémentaires (date, source, etc.)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (projet_id) REFERENCES projets(id) ON DELETE CASCADE
);

CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_projet ON documents(projet_id);
CREATE INDEX idx_documents_category ON documents(category);
```

#### API Endpoints Nécessaires
- `GET /documents` - Récupérer tous les documents de l'utilisateur (avec filtres par catégorie/projet)
- `POST /documents` - Uploader un nouveau document
- `GET /documents/:id` - Récupérer un document spécifique
- `DELETE /documents/:id` - Supprimer un document
- `PUT /documents/:id` - Mettre à jour les métadonnées d'un document

#### Module Backend
- Créer `backend/src/documents/` avec :
  - `documents.controller.ts`
  - `documents.service.ts`
  - `documents.module.ts`
  - `dto/create-document.dto.ts`
  - `dto/update-document.dto.ts`

### 2. Frontend

#### Service API
- Créer `src/services/documents/documentsService.ts` pour appeler les endpoints

#### Redux Store (Optionnel)
- Créer `src/store/slices/documentsSlice.ts` pour gérer l'état des documents

#### Composants
- Implémenter le chargement réel dans `DocumentsScreen.tsx`
- Ajouter la fonctionnalité d'upload de documents
- Implémenter l'ouverture/visualisation des documents
- Gérer le stockage des fichiers (via expo-file-system ou service cloud)

---

## Recommandations

### Option 1 : Menu Centralisé de Documents
- Créer une table `documents` dédiée
- Permettre l'upload de documents libres
- Agréger automatiquement certains documents depuis d'autres tables (photos d'animaux, etc.)

### Option 2 : Menu d'Agrégation (Recommandé pour MVP)
- Ne pas créer de table dédiée immédiatement
- Agréger les documents existants depuis les autres tables :
  - Photos d'animaux depuis `production_animaux.photo`
  - Photos de vaccins depuis `vaccinations.photo_flacon`
  - Liens vers factures/ventes depuis `revenus` (si colonnes ajoutées)
- Permettre la navigation vers les modules sources

### Option 3 : Documents Générés
- Stocker les documents générés (rapports PDF, exports Excel)
- Les rendre disponibles dans ce menu
- Ajouter des métadonnées pour catégorisation

---

## Conclusion

Le menu "Mes documents" est actuellement un **shell vide** avec :
- ✅ Une interface utilisateur complète
- ✅ Une structure de données définie
- ❌ Aucune source de données
- ❌ Aucune fonctionnalité backend
- ❌ Aucune intégration avec les données existantes

Pour le rendre fonctionnel, il faut choisir une approche (agrégation vs table dédiée) et implémenter le backend + la logique frontend correspondante.

