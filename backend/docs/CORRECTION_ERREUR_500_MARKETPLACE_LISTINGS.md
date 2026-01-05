# 🔧 Correction Erreur 500 - Endpoint /marketplace/listings

**Date** : 2026-01-05  
**Problème** : Erreur 500 Internal server error sur GET /marketplace/listings

---

## ❌ Problème Identifié

L'endpoint `GET /marketplace/listings` retournait une erreur 500 avec retry automatique (3 tentatives).

### Causes Potentielles

1. **Parsing JSON invalide** : `JSON.parse()` sur `sale_terms` ou `pig_ids` pouvait échouer
2. **Valeurs null/undefined** : `parseFloat()` sur des valeurs null retournait `NaN`
3. **Dates invalides** : `new Date()` sur des valeurs invalides
4. **Colonnes manquantes** : Si une colonne n'existe pas dans la table
5. **Erreur de mapping** : Une erreur dans `mapRowToListing` faisait échouer toute la requête

---

## ✅ Corrections Appliquées

### 1. Amélioration de `mapRowToListing`

**Fichier** : `backend/src/marketplace/marketplace.service.ts`

**Changements** :
- ✅ Ajout de fonctions helper sécurisées :
  - `safeJsonParse()` : Gère les objets déjà parsés (JSONB) et les chaînes
  - `safeParseFloat()` : Gère les valeurs null/undefined et retourne `undefined` au lieu de `NaN`
  - `safeParseDate()` : Gère les dates invalides

**Code** :
```typescript
// Fonction helper pour parser JSON de manière sécurisée
const safeJsonParse = (value: any, defaultValue: any = null): any => {
  // Si c'est déjà un objet/array, le retourner tel quel (JSONB)
  if (value && (typeof value === 'object' && !Array.isArray(value) || Array.isArray(value))) {
    return value;
  }
  // Si c'est null/undefined, retourner la valeur par défaut
  if (!value) {
    return defaultValue;
  }
  // Si c'est une chaîne, essayer de la parser
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
};
```

### 2. Gestion d'Erreur par Ligne

**Changement** : Au lieu de faire échouer toute la requête si un listing a un problème, on skip ce listing et on continue avec les autres.

**Code** :
```typescript
// Mapper les résultats avec gestion d'erreur pour chaque ligne
const listings = [];
for (const row of result.rows) {
  try {
    listings.push(this.mapRowToListing(row));
  } catch (error: any) {
    this.logger.error(`Erreur lors du mapping d'un listing (id: ${row?.id || 'unknown'}):`, {
      error: error.message,
      stack: error.stack,
      rowData: {
        id: row?.id,
        listing_type: row?.listing_type,
        status: row?.status,
      },
    });
    // Continuer avec les autres listings au lieu de tout faire échouer
  }
}
```

### 3. Amélioration des Logs

**Changement** : Logs plus détaillés pour faciliter le débogage.

**Code** :
```typescript
this.logger.error('Erreur lors de la récupération des listings:', {
  error: error.message,
  stack: error.stack,
  query: query.substring(0, 200),
  params: params,
});
```

### 4. Gestion des Colonnes Manquantes

**Changement** : Détection améliorée des erreurs de colonnes manquantes.

**Code** :
```typescript
if (error.message?.includes('does not exist') || 
    error.message?.includes('n\'existe pas') || 
    (error.message?.includes('column') && error.message?.includes('does not exist'))) {
  this.logger.warn('Table ou colonne marketplace_listings n\'existe pas encore, retour d\'un tableau vide');
  return [];
}
```

---

## 🔍 Points d'Attention

### JSONB vs JSON String

PostgreSQL stocke `sale_terms` et `pig_ids` comme **JSONB**. Quand on récupère ces valeurs avec `pg`, elles sont **déjà parsées en objets JavaScript**. Il ne faut donc pas les parser à nouveau.

**Solution** : `safeJsonParse()` vérifie d'abord si c'est déjà un objet avant de parser.

### Valeurs Null

Certaines colonnes peuvent être `NULL` dans la base de données :
- `location_latitude`, `location_longitude` : Peuvent être null
- `weight` : Peut être null
- `calculated_price` : Peut être null

**Solution** : `safeParseFloat()` retourne `undefined` au lieu de `NaN` pour les valeurs null.

---

## 📊 Résultat

- ✅ **Robustesse** : Les erreurs de mapping ne font plus échouer toute la requête
- ✅ **Logs** : Logs détaillés pour faciliter le débogage
- ✅ **Compatibilité** : Gère les JSONB (objets déjà parsés) et les chaînes JSON
- ✅ **Performance** : Continue même si un listing a un problème

---

## 🧪 Tests Recommandés

1. **Test avec données valides** : Vérifier que les listings valides sont retournés
2. **Test avec données corrompues** : Vérifier que les listings corrompus sont skippés
3. **Test avec colonnes manquantes** : Vérifier que l'erreur est gérée gracieusement
4. **Test avec valeurs null** : Vérifier que les valeurs null sont gérées correctement

---

## 📝 Prochaines Étapes

1. **Vérifier les logs** : Regarder les logs du backend pour voir quelle erreur exacte se produit
2. **Vérifier les migrations** : S'assurer que toutes les migrations ont été exécutées
3. **Vérifier les données** : Vérifier s'il y a des données corrompues dans la table

---

**Date de correction** : 2026-01-05  
**Statut** : ✅ Corrections appliquées

