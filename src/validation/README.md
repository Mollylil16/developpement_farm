# 🛡️ Validation des Formulaires

Ce dossier contient tous les schémas de validation Yup pour l'application.

## 📁 Structure

```
validation/
├── financeSchemas.ts      # Schémas pour Finance (revenus, dépenses, charges fixes)
├── productionSchemas.ts   # Schémas pour Production (animaux, pesées, mortalités)
└── README.md             # Ce fichier
```

## 🚀 Utilisation

### 1. Validation d'un objet complet

```typescript
import { revenuSchema, validateWithSchema } from '../validation/financeSchemas';

const data = {
  montant: 50000,
  categorie: 'vente_porc',
  date: '2024-01-15',
  poids_kg: 100,
};

const { isValid, errors } = await validateWithSchema(revenuSchema, data);

if (!isValid) {
  console.log('Erreurs:', errors);
  // errors = { montant: 'Le montant est obligatoire', ... }
}
```

### 2. Validation d'un champ individuel

```typescript
import { revenuSchema, validateField } from '../validation/financeSchemas';

const error = await validateField(
  revenuSchema,
  'montant',
  -100,
  { /* autres données si nécessaire */ }
);

if (error) {
  console.log('Erreur:', error); // "Le montant doit être positif"
}
```

### 3. Intégration dans un formulaire React

```typescript
import React, { useState } from 'react';
import { revenuSchema, validateWithSchema } from '../validation/financeSchemas';

function RevenuForm() {
  const [formData, setFormData] = useState({ montant: 0, categorie: '', date: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    const { isValid, errors: validationErrors } = await validateWithSchema(
      revenuSchema,
      formData
    );

    if (!isValid) {
      setErrors(validationErrors);
      return;
    }

    // Soumettre les données
    await submitRevenu(formData);
  };

  return (
    <View>
      <TextInput
        value={formData.montant.toString()}
        onChangeText={(text) => setFormData({ ...formData, montant: Number(text) })}
      />
      {errors.montant && <Text style={{ color: 'red' }}>{errors.montant}</Text>}
      
      <Button title="Enregistrer" onPress={handleSubmit} />
    </View>
  );
}
```

## 📝 Schémas disponibles

### Finance

- **`revenuSchema`** - Validation des revenus
  - montant: nombre positif, obligatoire, max 1 milliard
  - categorie: 'vente_porc' | 'vente_porcelets' | 'autre'
  - date: string obligatoire
  - poids_kg: nombre positif optionnel
  - commentaire: string optionnel, max 500 caractères

- **`depenseSchema`** - Validation des dépenses
  - montant: nombre positif, obligatoire
  - libelle_categorie: string obligatoire
  - type_depense: 'OPEX' | 'CAPEX'
  - date: string obligatoire
  - duree_amortissement_mois: obligatoire si CAPEX
  - commentaire: string optionnel

- **`chargeFixeSchema`** - Validation des charges fixes
  - nom: string obligatoire, 2-100 caractères
  - montant_mensuel: nombre positif, obligatoire
  - categorie: string obligatoire
  - date_debut: string obligatoire
  - date_fin: optionnel, doit être après date_debut
  - description: string optionnel

### Production

- **`animalSchema`** - Validation des animaux
  - code: string obligatoire, format: A-Z, 0-9, - uniquement
  - nom: string optionnel
  - sexe: 'male' | 'femelle'
  - race: string obligatoire
  - date_naissance: date passée, obligatoire
  - date_acquisition: après date_naissance, obligatoire
  - poids_actuel: nombre positif optionnel
  - prix_achat: nombre positif optionnel

- **`peseeSchema`** - Validation des pesées
  - animal_id: string obligatoire
  - poids: nombre positif 0.1-1000 kg
  - date: date passée, obligatoire
  - commentaire: string optionnel

- **`mortaliteSchema`** - Validation des mortalités
  - categorie: 'truie' | 'verrat' | 'porcelet' | 'autre'
  - nombre_porcs: entier positif, max 1000
  - date: date passée, obligatoire
  - cause: string optionnel
  - description: string optionnel

## 🔧 Helpers

### `validateWithSchema(schema, data)`
Valide un objet complet et retourne tous les erreurs.

**Retour:**
```typescript
{
  isValid: boolean;
  errors: Record<string, string>;
}
```

### `validateField(schema, fieldName, value, allData?)`
Valide un champ individuel.

**Retour:** `string | null` (message d'erreur ou null si valide)

## ✅ Bonnes pratiques

1. **Validation côté client ET serveur** : Toujours valider sur le serveur aussi
2. **Messages d'erreur clairs** : Les messages sont en français et explicites
3. **Validation en temps réel** : Valider chaque champ `onBlur` pour meilleure UX
4. **Feedback visuel** : Afficher les erreurs sous les champs concernés
5. **Désactiver le submit** : Désactiver le bouton tant que le formulaire est invalide

## 📚 Documentation Yup

- [Documentation officielle](https://github.com/jquense/yup)
- [Guide des validations](https://github.com/jquense/yup#api)

