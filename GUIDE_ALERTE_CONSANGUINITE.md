# 🧬 Guide Utilisateur : Alertes de Consanguinité

## 📖 Introduction

La consanguinité (accouplement entre animaux apparentés) peut causer de graves problèmes de santé chez les porcelets. L'application détecte automatiquement ces risques et vous alerte avant de créer une gestation.

## 🚦 Niveaux d'Alerte

### 🚨 CRITIQUE (Rouge)
**Quand ?** Parent avec enfant ou Frère avec sœur

**Que faire ?**
- ❌ **NE PAS CONTINUER** si possible
- 🔄 Choisir un autre verrat
- ⚠️ Risques graves pour les porcelets

**Exemple :**
```
Truie : Marie (T056)
Verrat : Louis XIV (V012) ← Père de Marie
❌ INTERDIRE cet accouplement
```

### ⚠️ ÉLEVÉ (Orange)
**Quand ?** Grand-parent avec petit-enfant

**Que faire ?**
- 🤔 Éviter si possible
- ✓ Acceptable en cas exceptionnel
- 📊 Surveiller la portée de près

### ⚠️ MODÉRÉ (Jaune)
**Quand ?** Demi-frère avec demi-sœur (un parent commun)

**Que faire ?**
- ✓ Acceptable occasionnellement
- ❌ Ne pas répéter sur plusieurs générations
- 📝 Noter dans les observations

### ✓ AUCUN RISQUE (Vert)
**Quand ?** Pas de relation de parenté détectée

**Que faire ?**
- ✅ Continuer normalement
- 👍 Accouplement recommandé

## 📱 Comment Utiliser

### 1. Créer une Nouvelle Gestation

```
Production → Reproduction → Gestations → ➕ Nouvelle Gestation
```

### 2. Sélectionner la Truie

- Saisir le numéro : `856` ✓
- Ou rechercher : "Marie"

### 3. Sélectionner le Verrat

**La liste affiche maintenant :**
- 🚨 Verrats à risque CRITIQUE
- ⚠️ Verrats à risque ÉLEVÉ/MODÉRÉ
- ✓ Verrats sans risque

**Exemple de liste :**
```
V012 - Louis XIV       🚨 (Père de la truie)
V023 - Napoléon        ⚠️ (Demi-frère)
V045 - Charlemagne     ✓ (Aucun risque)
```

### 4. Vérifier l'Alerte

**Si risque détecté**, un encadré s'affiche :

```
┌────────────────────────────────────┐
│ 🚨 RISQUE CRITIQUE                 │
│ Accouplement parent-enfant détecté │
│                                    │
│ Ce type d'accouplement peut causer │
│ de graves problèmes génétiques...  │
│                                    │
│ ⛔ Cet accouplement n'est PAS      │
│    recommandé                      │
└────────────────────────────────────┘
```

### 5. Prendre une Décision

**Risque CRITIQUE** :
- Une alerte popup s'affiche immédiatement
- Vous devrez confirmer **DEUX FOIS** pour continuer
- Fortement déconseillé

**Risque ÉLEVÉ/MODÉRÉ** :
- Alerte visuelle dans le formulaire
- Confirmation avant enregistrement
- À votre discrétion

## 🎯 Bonnes Pratiques

### ✅ À FAIRE

1. **Renseigner la généalogie**
   ```
   Cheptel → Sélectionner un animal → Modifier
   → Remplir "Père" et "Mère"
   ```

2. **Introduire du sang neuf**
   - Acheter des verrats externes tous les 2-3 ans
   - Échanger avec d'autres éleveurs

3. **Consulter les alertes**
   - Ne jamais ignorer les alertes critiques
   - Noter les alertes modérées dans un registre

4. **Planifier les accouplements**
   - Vérifier les relations AVANT la saillie réelle
   - Avoir plusieurs verrats disponibles

### ❌ À ÉVITER

1. **Ignorer les alertes critiques**
   - Risques de malformations
   - Mortalité élevée des porcelets

2. **Répéter les accouplements consanguins**
   - Accumulation de la consanguinité
   - Dégradation progressive du cheptel

3. **Négliger la généalogie**
   - Sans données, impossible de détecter
   - Risque d'accouplements consanguins non détectés

## 🔍 Exemples Réels

### Exemple 1 : Parent-Enfant (CRITIQUE)

```
Situation :
- Truie T056 "Marie" née de V012 "Louis XIV"
- Tentative d'accoupler T056 avec V012

Alerte : 🚨 CRITIQUE - Parent-Enfant

Solution :
- Utiliser V045 "Charlemagne" (sans lien)
- Ou acheter un nouveau verrat
```

### Exemple 2 : Demi-frère/sœur (MODÉRÉ)

```
Situation :
- Truie T078 "Joséphine" (Père: V023)
- Verrat V034 "Bonaparte" (Père: V023)
- Même père, mères différentes

Alerte : ⚠️ MODÉRÉ - Demi-frère/sœur

Solution :
- Acceptable une fois
- Surveiller la qualité de la portée
- Ne pas répéter avec les descendants
```

### Exemple 3 : Aucun Risque (OK)

```
Situation :
- Truie T089 "Victoria" (Père: V045, Mère: T011)
- Verrat V067 "Wellington" (Père: V023, Mère: T034)
- Aucune relation détectée

Alerte : ✓ Aucun risque

Solution :
- Continuer normalement
- Accouplement recommandé
```

## 📊 Comprendre les Risques

### Coefficient de Consanguinité

| Type de Relation | Coefficient | Risque |
|-----------------|-------------|--------|
| Parent-Enfant | 25% | 🚨 Critique |
| Frère-Sœur | 25% | 🚨 Critique |
| Grand-parent | 12.5% | ⚠️ Élevé |
| Demi-frère/sœur | 12.5% | ⚠️ Modéré |
| Cousins germains | 6.25% | ⚠️ Faible |
| Aucun lien | 0% | ✓ Aucun |

### Conséquences de la Consanguinité

**À court terme :**
- 🐷 Porcelets chétifs
- 💀 Mortalité néonatale élevée
- 🏥 Malformations visibles
- 📉 Faible poids de naissance

**À moyen terme :**
- 📊 GMQ réduit (croissance lente)
- 🤒 Sensibilité aux maladies
- 🧬 Problèmes de fertilité
- 💰 Baisse de rentabilité

**À long terme :**
- 📉 Dégradation du cheptel
- 🔄 Nécessité de renouvellement complet
- 💸 Pertes économiques importantes

## 🆘 FAQ

### Q1 : L'alerte ne s'affiche pas, pourquoi ?

**R :** Les informations de parenté ne sont pas renseignées.

**Solution :**
1. Aller dans "Cheptel"
2. Sélectionner l'animal
3. Modifier et remplir "Père" et "Mère"

---

### Q2 : Puis-je ignorer une alerte critique ?

**R :** Techniquement oui, mais fortement déconseillé.

**Raisons :**
- Risques graves pour la santé des porcelets
- Perte économique importante
- Non-conformité aux bonnes pratiques

**Alternative :** Chercher un verrat sans lien de parenté.

---

### Q3 : Tous mes verrats ont une alerte, que faire ?

**R :** Votre cheptel est trop consanguin.

**Solutions :**
1. **Urgent** : Acheter un verrat externe
2. **Court terme** : Emprunter/échanger avec un voisin
3. **Long terme** : Planifier le renouvellement

---

### Q4 : Comment éviter la consanguinité à l'avenir ?

**R :** Planification et diversité.

**Stratégie :**
1. Avoir au moins 2-3 verrats non apparentés
2. Renouveler les verrats tous les 2-3 ans
3. Tenir un registre des accouplements
4. Échanger des reproducteurs avec d'autres éleveurs

---

### Q5 : L'alerte est-elle fiable à 100% ?

**R :** Elle est fiable SI les données sont complètes.

**Limites :**
- Ne détecte que les relations renseignées
- Parents inconnus = pas de détection possible
- Limité aux 2-3 générations actuellement

**Amélioration :** Renseigner la généalogie complète.

## 📞 Besoin d'Aide ?

1. **Consulter la documentation technique** : `ALERTE_CONSANGUINITE_DOCUMENTATION.md`
2. **Vérifier les données** : Menu "Cheptel"
3. **Contacter un technicien** : Support de l'application

---

**💡 Conseil Final** : La prévention de la consanguinité est un investissement pour la santé et la rentabilité de votre élevage. Prenez le temps de renseigner la généalogie et de planifier vos accouplements !

---

**Version** : 1.0.0  
**Dernière mise à jour** : Novembre 2024

