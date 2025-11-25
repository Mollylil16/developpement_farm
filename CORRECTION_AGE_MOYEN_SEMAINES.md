# 🔧 Correction: Âge Moyen en Semaines

**Date**: 24 Novembre 2025  
**Demande**: L'âge moyen doit être en semaines (pas en jours) et ne doit pas être obligatoire

---

## ✅ Modifications Appliquées

### 1. Formulaire de Création de Projet

**Fichier**: `src/screens/CreateProjectScreen.tsx`

**Avant:**
```typescript
<FormField
  label="Âge moyen (jours)"
  placeholder="Ex: 90"
  required
  // ...
/>
```

**Après:**
```typescript
<FormField
  label="Âge moyen (semaines)"
  placeholder="Ex: 12"
  // required retiré ✅
  // ...
/>
```

**Changements:**
- ✅ Label: "Âge moyen (jours)" → "Âge moyen (semaines)"
- ✅ Placeholder: "Ex: 90" → "Ex: 12"
- ✅ Champ `required` **retiré**

---

### 2. Paramètres du Projet

**Fichier**: `src/components/ParametresProjetComponent.tsx`

**Avant:**
```typescript
<FormField
  label="Âge moyen actuel (jours)"
  // ...
/>
```

**Après:**
```typescript
<FormField
  label="Âge moyen actuel (semaines)"
  // ...
/>
```

**Changements:**
- ✅ Label: "Âge moyen actuel (jours)" → "Âge moyen actuel (semaines)"

---

## 📊 Impact

### Unité de Stockage

**Important:** L'unité de stockage dans la base de données **CHANGE** :

| Avant | Après |
|-------|-------|
| Âge en **jours** | Âge en **semaines** |
| Ex: 90 jours | Ex: 12 semaines |

**Conversion:**
- 1 semaine = 7 jours
- 12 semaines ≈ 84 jours
- 16 semaines ≈ 112 jours

### Champ Obligatoire

| Avant | Après |
|-------|-------|
| ✅ Obligatoire | ❌ Optionnel |

**Avantage:** L'utilisateur peut créer un projet sans connaître l'âge moyen (valeur par défaut: 0).

---

## 🧪 Test à Effectuer

### Test 1: Création de Projet Sans Âge

1. ☐ Aller dans "Créer votre ferme"
2. ☐ Remplir les champs **obligatoires** (nom, localisation)
3. ☐ **Ne PAS remplir** "Âge moyen (semaines)"
4. ☐ Cliquer "Créer le projet"
5. ☐ **Vérifier**: Le projet est créé avec succès ✅

### Test 2: Création avec Âge en Semaines

1. ☐ Aller dans "Créer votre ferme"
2. ☐ Remplir "Âge moyen (semaines)": **12**
3. ☐ Créer le projet
4. ☐ Aller dans Paramètres → Informations du projet
5. ☐ **Vérifier**: "Âge moyen actuel (semaines)" affiche **12** ✅

### Test 3: Modification dans Paramètres

1. ☐ Aller dans Paramètres → Informations du projet
2. ☐ Modifier "Âge moyen actuel (semaines)": **16**
3. ☐ Sauvegarder
4. ☐ **Vérifier**: La valeur est mise à jour correctement ✅

---

## ⚠️ Migration des Données Existantes

Si vous avez **déjà des projets** créés avec l'ancienne unité (jours), leurs valeurs sont maintenant interprétées comme des semaines.

### Exemple

**Avant la modification:**
- Âge moyen: **90** (jours)

**Après la modification:**
- Âge moyen: **90** (maintenant interprété comme 90 semaines !)
- **90 semaines ≈ 630 jours ≈ 21 mois** ❌ Incorrect !

### Solution

Si vous souhaitez **convertir les données existantes** :

```typescript
// Script de migration (à exécuter UNE FOIS)
const convertirJoursEnSemaines = async () => {
  // Récupérer tous les projets
  const projets = await db.executeSql('SELECT * FROM projets');
  
  for (const projet of projets) {
    const ageSemaines = Math.round(projet.age_moyen_actuel / 7);
    await db.executeSql(
      'UPDATE projets SET age_moyen_actuel = ? WHERE id = ?',
      [ageSemaines, projet.id]
    );
  }
};
```

**Recommandation:** Si vous avez peu de projets, il est plus simple de les **corriger manuellement** via Paramètres.

---

## 📝 Fichiers Modifiés

1. ✅ **`src/screens/CreateProjectScreen.tsx`**
   - Ligne 343: Label changé en "Âge moyen (semaines)"
   - Ligne 344: Placeholder changé en "Ex: 12"
   - Ligne 350: `required` retiré

2. ✅ **`src/components/ParametresProjetComponent.tsx`**
   - Ligne 337: Label changé en "Âge moyen actuel (semaines)"

---

## 💡 Remarques

### Pourquoi Semaines ?

Les semaines sont plus pratiques pour l'élevage porcin :
- **Sevrage**: 3-4 semaines
- **Post-sevrage**: 4-8 semaines
- **Croissance**: 8-16 semaines
- **Engraissement**: 16-24 semaines

### Valeurs Typiques

| Catégorie | Âge en Semaines |
|-----------|-----------------|
| Porcelets sevrés | 3-4 semaines |
| Post-sevrage | 8-10 semaines |
| Porcs en croissance | 12-16 semaines |
| Porcs à l'engrais | 20-24 semaines |
| Truies reproductrices | > 32 semaines |

---

**Status**: ✅ Corrigé  
**Testez**: Créez un nouveau projet sans âge moyen ou avec une valeur en semaines ! 🎉

