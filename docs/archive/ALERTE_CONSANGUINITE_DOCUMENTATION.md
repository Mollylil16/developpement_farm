# 🧬 Système d'Alerte de Consanguinité

## 📋 Vue d'ensemble

Le système d'alerte de consanguinité est un outil de prévention essentiel pour l'élevage porcin. Il détecte automatiquement les risques de consanguinité lors de la création d'une nouvelle gestation et alerte l'éleveur avant que l'accouplement ne soit enregistré.

## 🎯 Objectifs

1. **Prévenir les problèmes génétiques** : La consanguinité peut causer des malformations, une faible vitalité et des performances réduites
2. **Traçabilité génétique** : Maintenir un registre clair de la généalogie du troupeau
3. **Amélioration du cheptel** : Favoriser la diversité génétique pour des animaux plus sains et productifs
4. **Conformité** : Respecter les bonnes pratiques d'élevage

## 📊 Types de Risques Détectés

### 1. 🚨 Risque CRITIQUE (Bloquant avec confirmation)

#### Parent-Enfant
- **Description** : Le verrat est le père de la truie (ou vice versa)
- **Coefficient de consanguinité** : 25%
- **Conséquences** :
  - Malformations graves
  - Mortalité néonatale élevée
  - Faible vitalité des porcelets
  - Problèmes de fertilité
- **Action** : Alerte critique avec demande de confirmation

#### Frère-Sœur
- **Description** : La truie et le verrat ont les mêmes parents (même père ET même mère)
- **Coefficient de consanguinité** : 25%
- **Conséquences** :
  - Risques similaires à parent-enfant
  - Concentration de gènes récessifs délétères
  - Diminution des performances zootechniques
- **Action** : Alerte critique avec demande de confirmation

### 2. ⚠️ Risque ÉLEVÉ (Avertissement)

#### Grand-parent/Petit-enfant
- **Description** : Le verrat est le grand-père de la truie (ou vice versa)
- **Coefficient de consanguinité** : 12.5%
- **Conséquences** :
  - Problèmes génétiques modérés
  - Diminution de la vigueur hybride
  - Performances réduites
- **Action** : Avertissement avec possibilité de continuer

### 3. ⚠️ Risque MODÉRÉ (Avertissement)

#### Demi-frère/Demi-sœur
- **Description** : La truie et le verrat partagent un parent (même père OU même mère, mais pas les deux)
- **Coefficient de consanguinité** : 12.5%
- **Conséquences** :
  - Risque modéré de problèmes génétiques
  - Légère diminution des performances
  - Accumulation progressive de consanguinité
- **Action** : Avertissement avec possibilité de continuer

### 4. ✓ Aucun Risque

- **Description** : Aucune relation de parenté proche détectée
- **Action** : Message de confirmation positif

## 🔄 Fonctionnement du Système

### 1. Détection Automatique

Lors de la création d'une gestation :

```
Étape 1: Sélection de la truie
  ↓
Étape 2: Sélection du verrat
  ↓
Étape 3: Détection automatique de la consanguinité
  ↓
Étape 4: Affichage visuel du risque (si présent)
  ↓
Étape 5: Confirmation (si risque critique/élevé/modéré)
  ↓
Étape 6: Enregistrement de la gestation
```

### 2. Indicateurs Visuels

#### Dans le formulaire de gestation

**Encadré d'alerte coloré** :
- 🚨 **Rouge** : Risque critique (parent-enfant, frère-sœur)
- ⚠️ **Orange** : Risque élevé (grand-parent/petit-enfant)
- ⚠️ **Jaune-orange** : Risque modéré (demi-frère/sœur)
- ✓ **Vert** : Aucun risque

**Contenu de l'alerte** :
- Icône représentative du niveau de risque
- Message clair du type de consanguinité
- Détails sur les conséquences potentielles
- Bannière rouge pour les risques critiques

#### Dans la liste des verrats

Lors de la sélection d'un verrat, chaque verrat affiche :
- **Icône** : 🚨, ⚠️, ou rien si aucun risque
- **Message** : Type de relation détectée
- **Couleur** : Code couleur selon le niveau de risque

### 3. Confirmations en Cascade

#### Risque Critique
```
🚨 Alerte critique immédiate après sélection du verrat
  ↓
Encadré rouge dans le formulaire
  ↓
Demande de confirmation avant soumission
  ↓
Options : "Annuler" ou "Continuer quand même" (destructive)
```

#### Risque Élevé/Modéré
```
⚠️ Avertissement visuel dans le formulaire
  ↓
Demande de confirmation avant soumission
  ↓
Options : "Annuler" ou "Continuer"
```

## 🧪 Algorithme de Détection

### Données Utilisées

Pour chaque animal (`ProductionAnimal`) :
- `id` : Identifiant unique
- `pere_id` : ID du père (peut être null)
- `mere_id` : ID de la mère (peut être null)

### Logique de Détection

#### 1. Parent-Enfant
```typescript
if (truie.pere_id === verrat.id || truie.mere_id === verrat.id ||
    verrat.pere_id === truie.id || verrat.mere_id === truie.id) {
  return PARENT_ENFANT;
}
```

#### 2. Frère-Sœur
```typescript
if ((truie.pere_id === verrat.pere_id && truie.pere_id !== null) &&
    (truie.mere_id === verrat.mere_id && truie.mere_id !== null)) {
  return FRERE_SOEUR;
}
```

#### 3. Demi-frère/Demi-sœur
```typescript
const memePere = (truie.pere_id === verrat.pere_id && truie.pere_id !== null);
const memeMere = (truie.mere_id === verrat.mere_id && truie.mere_id !== null);

if ((memePere || memeMere) && !(memePere && memeMere)) {
  return DEMI_FRERE_SOEUR;
}
```

#### 4. Grand-parent/Petit-enfant
```typescript
// Vérifier si le verrat est le grand-père de la truie
const mere = animaux.find(a => a.id === truie.mere_id);
if (mere && mere.pere_id === verrat.id) {
  return GRAND_PARENT_PETIT_ENFANT;
}

const pere = animaux.find(a => a.id === truie.pere_id);
if (pere && pere.pere_id === verrat.id) {
  return GRAND_PARENT_PETIT_ENFANT;
}
// ... (vérifications inverses)
```

## 📱 Interface Utilisateur

### Formulaire de Gestation

#### Composants Ajoutés

1. **État `resultatConsanguinite`**
   - Stocke le résultat de la détection
   - Mis à jour à chaque changement de truie/verrat

2. **Hook `useEffect` de détection**
   - Déclenché automatiquement lors de la sélection
   - Affiche une alerte popup pour les risques critiques

3. **Encadré d'alerte**
   - Positionné entre la sélection du verrat et la date de sautage
   - Affichage conditionnel selon le risque
   - Mise en forme adaptée au niveau de risque

4. **Liste des verrats enrichie**
   - Icône de risque à côté du nom
   - Message court sur le type de relation
   - Code couleur visuel

### Styles

```typescript
consanguiniteBox: {
  padding: SPACING.md,
  borderRadius: 12,
  marginVertical: SPACING.md,
  borderWidth: 1,
  // borderColor et backgroundColor dynamiques
}

consanguiniteHeader: {
  flexDirection: 'row',
  alignItems: 'center',
}

consanguiniteWarning: {
  backgroundColor: '#DC2626', // Rouge pour critique
  padding: SPACING.sm,
  borderRadius: 8,
  marginTop: SPACING.sm,
}
```

## 🔧 Fichiers Modifiés/Créés

### Nouveaux Fichiers

#### `src/utils/consanguiniteUtils.ts`
- **Rôle** : Logique de détection de consanguinité
- **Exports** :
  - `RisqueConsanguinite` (enum)
  - `ResultatConsanguinite` (interface)
  - `detecterConsanguinite()` (fonction principale)
  - `getCouleurRisque()`, `getIconeRisque()` (helpers UI)
  - `doitBloquerAccouplement()`, `doitAfficherAvertissement()` (helpers validation)

### Fichiers Modifiés

#### `src/components/GestationFormModal.tsx`
- **Imports** : Ajout des utilitaires de consanguinité
- **État** : `resultatConsanguinite`
- **Hooks** : `useEffect` pour détection automatique
- **Validation** : Vérifications avant soumission
- **UI** : Encadrés d'alerte et indicateurs dans la liste
- **Styles** : Nouveaux styles pour les alertes

## 🎓 Bonnes Pratiques

### Pour l'Éleveur

1. **Ne jamais ignorer les alertes critiques**
   - Les risques parent-enfant et frère-sœur sont dangereux
   - Chercher un verrat alternatif

2. **Évaluer les alertes modérées**
   - Acceptable de manière exceptionnelle
   - Éviter la répétition sur plusieurs générations

3. **Tenir à jour la généalogie**
   - Renseigner les parents lors de l'ajout d'animaux
   - Plus les données sont complètes, plus la détection est précise

4. **Introduire régulièrement du sang neuf**
   - Acheter des reproducteurs externes
   - Échanger avec d'autres éleveurs

### Pour le Développement

1. **Tester avec différents scénarios**
   - Cas simples (parent-enfant direct)
   - Cas complexes (grand-parents, arrière-grands-parents)
   - Cas limites (parents inconnus)

2. **Améliorer progressivement**
   - Ajouter la détection d'arrière-grands-parents
   - Calculer le coefficient de consanguinité global
   - Graphique de l'arbre généalogique

3. **Performance**
   - La détection est rapide (O(n) où n = nombre d'animaux)
   - Pas besoin de mise en cache pour le moment

## 📈 Évolutions Futures

### Court Terme
- ✅ Détection parent-enfant, frère-sœur, demi-frère/sœur
- ✅ Alertes visuelles dans le formulaire
- ✅ Indicateurs dans la liste des verrats

### Moyen Terme
- [ ] Détection des cousins (cousins germains)
- [ ] Calcul du coefficient de consanguinité (COI)
- [ ] Recommandations de verrats alternatifs
- [ ] Historique des accouplements consanguins

### Long Terme
- [ ] Graphique de l'arbre généalogique
- [ ] Calcul de la diversité génétique du troupeau
- [ ] Simulation d'accouplements optimaux
- [ ] Export des données généalogiques

## 🐷 Impact sur l'Élevage

### Avantages Immédiats

1. **Santé du cheptel**
   - Réduction des malformations
   - Meilleure vitalité des porcelets
   - Diminution de la mortalité néonatale

2. **Performances zootechniques**
   - Meilleur Gain Moyen Quotidien (GMQ)
   - Portées plus homogènes
   - Meilleure fertilité

3. **Économie**
   - Moins de pertes (mortalité)
   - Meilleur prix de vente (porcs de qualité)
   - Réduction des frais vétérinaires

### Métriques de Succès

- **Taux de consanguinité** : < 5% (objectif)
- **Mortalité néonatale** : Réduction de 20-30%
- **GMQ** : Augmentation de 5-10%

## 🆘 Dépannage

### Problème : "Aucun risque détecté" mais les animaux sont liés

**Cause** : Les informations de parenté (père/mère) ne sont pas renseignées pour tous les animaux.

**Solution** :
1. Vérifier les données dans "Cheptel"
2. Renseigner les champs `père` et `mère` pour chaque animal
3. Relancer la détection

### Problème : Alerte incorrecte

**Cause** : Données de parenté incorrectes ou dupliquées.

**Solution** :
1. Vérifier l'ID des parents dans la base de données
2. S'assurer qu'il n'y a pas de doublons
3. Corriger les données via l'interface "Cheptel"

### Problème : Performances lentes

**Cause** : Nombre très élevé d'animaux (> 1000).

**Solution** :
1. Optimisation : Indexer les champs `pere_id` et `mere_id` dans la base
2. Mise en cache des résultats de détection
3. Limiter la détection aux reproducteurs actifs uniquement

## 📞 Support

Pour toute question ou amélioration :
- Consulter ce document
- Vérifier les types dans `src/types/production.ts`
- Inspecter la logique dans `src/utils/consanguiniteUtils.ts`

---

**Version** : 1.0.0  
**Date de création** : Novembre 2024  
**Dernière mise à jour** : Novembre 2024

