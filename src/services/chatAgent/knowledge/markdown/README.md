# Base de Connaissances - Élevage Porcin Moderne

**Version** : 1.0  
**Date** : 27 décembre 2025  
**Destiné à** : Assistant Kouakou - Appui aux éleveurs de porcs

---

## Structure des Fichiers

Cette base de connaissances est organisée en 10 fichiers Markdown segmentés par thème pour faciliter l'accès et la maintenance :

1. **01-introduction-bonnes-pratiques.md** - Introduction, objectifs, choix du site, races
2. **02-nutrition-alimentation.md** - Besoins nutritionnels, ingrédients locaux, formulation, eau
3. **03-gestion-reproductivite.md** - Cycle sexuel, chaleurs, saillie, gestation, mise bas, sevrage
4. **04-croissance-engraissement.md** - Phases de croissance, GMQ, IC, densité, performance
5. **05-hygiene-biosécurité.md** - Nettoyage, désinfection, tout plein/tout vide, nuisibles, quarantaine
6. **06-sante-maladies.md** - Programme vaccinal, maladies courantes, traitements
7. **07-identification-suivi.md** - Méthodes d'identification, importance du suivi, enregistrements
8. **08-gestion-economique.md** - Coûts, rentabilité, indicateurs clés, calculs
9. **09-astuces-conseils.md** - Recettes locales, remèdes traditionnels, saison des pluies, signes mise bas
10. **10-ressources-contacts.md** - Directions régionales, fournisseurs, associations, numéros d'urgence

---

## Utilisation

Ces fichiers peuvent être :

1. **Importés dans la base de données PostgreSQL** via l'API backend `/knowledge-base`
2. **Utilisés pour enrichir** la base statique `TrainingKnowledgeBase.ts`
3. **Consultés directement** par les développeurs pour référence

---

## Format

Chaque fichier suit le format suivant :

```markdown
# Titre de la Section

**Catégorie:** `category_name`  
**Mots-clés:** mot1, mot2, mot3, ...

---

## Sous-section

Contenu détaillé...

---

**💡 Astuce :** Conseil pratique pour utiliser l'application
```

---

## Catégories Disponibles

- `general` - Généralités, introduction
- `alimentation` - Nutrition, alimentation
- `sante` - Santé, reproduction, maladies
- `finance` - Gestion économique
- `commerce` - Commercialisation
- `reglementation` - Réglementation

---

## Mise à Jour

Pour mettre à jour la base de connaissances :

1. Modifier le fichier Markdown correspondant
2. Réimporter dans la base de données (si nécessaire)
3. Mettre à jour `TrainingKnowledgeBase.ts` (si utilisé comme fallback)

---

## Notes

- Tous les prix sont en **FCFA** (Franc CFA)
- Tous les conseils sont adaptés au **contexte ivoirien/tropical**
- Le langage est **simple et accessible** pour les éleveurs
- Les exemples sont **concrets et pratiques**

