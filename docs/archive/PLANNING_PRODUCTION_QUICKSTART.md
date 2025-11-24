# 🚀 PLANNING PRODUCTION - GUIDE DE DÉMARRAGE RAPIDE

## ⚡ EN 3 MINUTES

### 1️⃣ ACCÉDER AU MODULE
```
Dashboard → Widget "Planning" (📊)
```

### 2️⃣ LANCER UNE SIMULATION
**Onglet "Simulation" 🧮**
```
1. Remplir le formulaire :
   - Objectif : 5 tonnes
   - Période : 12 mois
   - Poids moyen vente : 110 kg

2. Cliquer "Lancer la simulation"

3. Observer les résultats :
   ✅ Truies nécessaires : 4
   📊 Mises bas requises : 48
   🐷 Porcelets produits : 600
   💰 Animaux vendables : 510
   
4. Lire les recommandations :
   💡 "Votre cheptel actuel est suffisant"
   ⚠️ "Attention au taux de mortalité élevé"
```

### 3️⃣ PLANIFIER LES SAILLIES
**Onglet "Saillies" 📅**
```
1. Cliquer "Générer le plan"

2. Choisir la vue :
   - 📋 Liste : Voir toutes les saillies planifiées
   - 📅 Calendrier : Visualiser sur l'année

3. Consulter les détails :
   - Date de saillie
   - Truie assignée
   - Verrat assigné
   - Date de mise bas prévue
```

### 4️⃣ PRÉVOIR LES VENTES
**Onglet "Ventes" 💰**
```
1. Cliquer "Actualiser les prévisions"

2. Voir les urgences :
   🔴 Semaine prochaine : 3 animaux
   🟠 Mois prochain : 12 animaux
   🟢 Total : 45 animaux

3. Consulter le calendrier :
   - Marqueurs colorés par urgence
   - Détails par animal au clic
```

---

## 🎯 CAS D'USAGE TYPIQUES

### Cas 1 : "Je veux produire 10 tonnes en 1 an"
```
1. Simulation → Objectif 10 tonnes, 12 mois
2. Résultat : "Il vous faut 8 truies"
3. Action : Acheter 3 truies supplémentaires (vous en avez 5)
4. Saillies → Générer le plan (96 saillies)
5. Ventes → Prévoir les ventes (900+ animaux)
```

### Cas 2 : "Quand dois-je vendre mes porcs ?"
```
1. Ventes → Actualiser les prévisions
2. Consulter la liste triée par urgence
3. Identifier les animaux à 7 jours (rouges)
4. Planifier la vente immédiate
```

### Cas 3 : "Comment améliorer ma production ?"
```
1. Simulation → Lancer simulation
2. Lire les recommandations :
   ⚠️ "Taux de mortalité élevé : 18%"
   💡 Actions suggérées :
      • Revoir protocoles sanitaires
      • Améliorer conditions d'élevage
      • Consulter un vétérinaire
```

---

## 📊 PARAMÈTRES PAR DÉFAUT

```typescript
Durée gestation : 114 jours
Durée sevrage : 21 jours
Durée engraissement : 180 jours
Portée moyenne : 12 porcelets
Taux mortalité porcelets : 10%
Taux mortalité engraissement : 5%
Poids moyen vente : 110 kg
Intervalle mise bas : 150 jours (5 mois)
GMQ estimé : 700 g/jour
```

*Ces paramètres sont modifiables dans le code si nécessaire.*

---

## ❓ FAQ RAPIDE

**Q: Pourquoi "Objectif difficilement atteignable" ?**
R: Votre cheptel actuel est trop petit. Consultez les recommandations pour savoir combien de truies acheter.

**Q: Comment assigner des truies/verrats aux saillies ?**
R: C'est automatique ! Le système assigne intelligemment selon disponibilité.

**Q: Les prévisions de vente sont-elles précises ?**
R: Elles sont basées sur le GMQ réel de vos animaux. Plus vous pesez régulièrement, plus c'est précis.

**Q: Puis-je modifier une saillie planifiée ?**
R: Oui, supprimez-la et ajoutez-en une manuellement (fonctionnalité à venir).

**Q: Les données sont-elles sauvegardées ?**
R: Oui, tout est sauvegardé dans Redux et synchronisé avec la base de données.

---

## 🎨 LÉGENDES VISUELLES

### Couleurs d'urgence
```
🔴 Rouge (Critique)    : ≤ 7 jours
🟠 Orange (Avertissement) : ≤ 30 jours
🟢 Vert (Normal)       : > 30 jours
🔵 Bleu (Info)         : Informations générales
```

### Icônes
```
🧮 calculator      : Simulation
📅 calendar        : Saillies
💰 cash            : Ventes
📊 stats-chart     : Statistiques
✅ checkmark-circle : Faisable
⚠️ alert-circle    : Critique
💡 bulb            : Recommandations
```

---

## 🔥 ASTUCES PRO

### Astuce 1 : Actualiser les données
```
Tirez l'écran vers le bas → Pull-to-refresh
```

### Astuce 2 : Comparer plusieurs simulations
```
1. Lancer simulation avec objectif 5 tonnes
2. Noter les résultats
3. Lancer simulation avec objectif 10 tonnes
4. Comparer les truies nécessaires
```

### Astuce 3 : Optimiser le planning
```
Si trop de saillies le même mois :
1. Augmenter l'intervalle entre mise bas
2. Répartir manuellement sur plusieurs mois
```

### Astuce 4 : Anticiper les ventes
```
1. Consulter l'onglet Ventes chaque semaine
2. Identifier les animaux "Urgent" (rouge)
3. Planifier la vente 1 semaine à l'avance
4. Maximiser le prix de vente
```

---

## 🛠️ DÉPANNAGE RAPIDE

### Problème : "Aucune prévision de vente"
**Solution** : Vous n'avez pas d'animaux en engraissement. Ajoutez des porcs de croissance.

### Problème : "Impossible de générer le plan"
**Solution** : Lancez d'abord une simulation dans l'onglet "Simulation".

### Problème : "Truies nécessaires : 0"
**Solution** : Vérifiez vos paramètres (objectif > 0, période > 0).

### Problème : "Chargement infini"
**Solution** : Vérifiez votre connexion. Tirez l'écran vers le bas pour actualiser.

---

## 📱 CAPTURES D'ÉCRAN (À AJOUTER)

```
[ Simulation - Formulaire ]
[ Simulation - Résultats ]
[ Saillies - Calendrier ]
[ Saillies - Liste ]
[ Ventes - Calendrier ]
[ Ventes - Liste avec barre de progression ]
```

---

## 🎓 PROCHAINES ÉTAPES

1. **Tester le module** avec vos données réelles
2. **Comparer** les prévisions avec la réalité
3. **Ajuster** les paramètres si nécessaire
4. **Suivre** les recommandations pour optimiser
5. **Répéter** chaque mois pour suivre l'évolution

---

## 📞 SUPPORT

**Questions ?** Consultez `MODULE_PLANNING_PRODUCTION_COMPLET.md` pour la documentation complète.

**Bugs ?** Vérifiez les logs dans la console avec `console.log` activé.

**Suggestions ?** Notez-les pour la prochaine version !

---

*Module créé avec ❤️ pour simplifier la gestion de votre élevage*

---

## ⚡ RÉSUMÉ EN 30 SECONDES

```
1. Dashboard → Planning
2. Simulation → Remplir formulaire → Lancer
3. Saillies → Générer le plan → Consulter
4. Ventes → Actualiser → Planifier ventes urgentes
5. Suivre les recommandations 💡
```

**C'EST PARTI ! 🚀**

