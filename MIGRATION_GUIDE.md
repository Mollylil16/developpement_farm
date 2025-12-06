# 🚀 GUIDE DE MIGRATION SQLite → PostgreSQL

## ✅ ÉTAPE 1 : Migration des données

### 1. Copier le fichier SQLite
Copier `fermier_pro.db` dans `fermier-pro/data/fermier_pro.db`

### 2. Exécuter la migration
```bash
cd fermier-pro/backend
migrate.bat
```

Le script va :
- Lire toutes les données SQLite
- Les insérer dans PostgreSQL
- Respecter les dépendances (users → projets → ...)

---

## ✅ ÉTAPE 2 : Configuration Frontend

### 1. Créer le fichier `.env` dans `fermier-pro/`
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_USE_API=true
```

### 2. Démarrer le backend
```bash
cd fermier-pro/backend
npm run start:dev
```

---

## ✅ ÉTAPE 3 : Adapter database.ts

Les méthodes suivantes sont déjà adaptées :
- ✅ `getUserByEmail`
- ✅ `getUserByTelephone`
- ✅ `getUserByIdentifier`
- ✅ `getUserById`
- ✅ `initialize` (détecte automatiquement le mode API)

**Pour adapter les autres méthodes**, ajouter au début de chaque méthode :

```typescript
async maMethode(...args) {
  if (API_CONFIG.USE_API) {
    return apiClient.maMethodeAPI(...args);
  }
  
  // Code SQLite existant...
}
```

---

## 📋 MÉTHODES À ADAPTER (par priorité)

### Priorité 1 (Critique - Auth & Projets)
- [ ] `createUser`
- [ ] `updateUser`
- [ ] `loginUser`
- [ ] `createProjet`
- [ ] `getProjetById`
- [ ] `getAllProjets`
- [ ] `getProjetActif`
- [ ] `updateProjet`

### Priorité 2 (Finance)
- [ ] `createChargeFixe`
- [ ] `getAllChargesFixes`
- [ ] `createDepensePonctuelle`
- [ ] `getAllDepensesPonctuelles`
- [ ] `createRevenu`
- [ ] `getAllRevenus`

### Priorité 3 (Reproduction)
- [ ] `createGestation`
- [ ] `getAllGestations`
- [ ] `createSevrage`
- [ ] `getAllSevrages`

### Priorité 4 (Production)
- [ ] `createProductionAnimal`
- [ ] `getProductionAnimaux`
- [ ] `createPesee`
- [ ] `getPeseesParAnimal`

### Priorité 5 (Santé)
- [ ] `createVaccination`
- [ ] `getVaccinationsByProjet`
- [ ] `createMaladie`
- [ ] `getMaladiesByProjet`
- [ ] `createTraitement`
- [ ] `getTraitementsByProjet`

### Priorité 6 (Autres)
- [ ] Toutes les autres méthodes...

---

## 🎯 STATUT ACTUEL

- ✅ Script de migration créé
- ✅ API Client créé (toutes les méthodes API disponibles)
- ✅ Configuration API créée
- ✅ 4 méthodes Users adaptées
- ⏳ ~160 méthodes restantes à adapter

---

## 💡 STRATÉGIE RECOMMANDÉE

1. **Tester la migration** d'abord
2. **Adapter les méthodes critiques** (Auth, Projets)
3. **Tester l'application** avec ces méthodes
4. **Adapter progressivement** les autres modules
5. **Désactiver SQLite** une fois tout adapté

---

## ⚠️ NOTES IMPORTANTES

- Le fichier `database.ts` fait 8267 lignes
- Il y a ~167 méthodes à adapter
- L'adaptation peut se faire progressivement
- SQLite reste disponible en fallback si `USE_API=false`

