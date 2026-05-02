# Sécurité - Vulnérabilités connues

## Vulnérabilités actives

### qs < 6.14.1 (GHSA-6rw7-vpxm-498p)
**Statut :** ⚠️ En attente de correction  
**Sévérité :** Haute  
**Type :** DoS via épuisement de mémoire  
**Date de détection :** 2025-12-30

**Détails :**
- **Package affecté :** `qs@6.14.0`
- **Dépendance transitive :** `@react-native-community/cli` → `@react-native-community/cli-server-api` → `body-parser@1.20.4` → `qs@6.14.0`
- **Type de dépendance :** Développement uniquement (devDependency)
- **Impact en production :** ⚠️ Limité (non utilisé en production)

**Advisory GitHub :** https://github.com/advisories/GHSA-6rw7-vpxm-498p

**Action requise :**
- L'advisory indique qu'il faut `qs >= 6.14.1`, mais cette version n'existe pas encore sur npm
- ⚠️ **Note importante :** `npm audit fix` indique qu'une correction est disponible, mais c'est un **faux positif**. La version 6.14.1 n'existe pas encore sur npm (vérifié le 2025-12-30)
- Surveiller les mises à jour de `qs` et `@react-native-community/cli`
- Exécuter `npm run deps:security:check` régulièrement pour détecter quand une correction sera disponible

**Vérification :**
```bash
# Script automatisé (recommandé)
npm run deps:security:check

# Vérifications manuelles
npm audit
npm view qs version
npm view qs@6.14.1  # Vérifier si la version corrigée existe
npm outdated @react-native-community/cli
```

**Correction prévue :**
- Attendre la publication de `qs@6.14.1+` ou
- Mise à jour de `@react-native-community/cli` vers une version utilisant une version corrigée

---

## Procédure de gestion des vulnérabilités

1. **Détection :** Exécuter `npm audit` régulièrement
2. **Évaluation :** Déterminer l'impact (production vs développement)
3. **Correction :** 
   - Essayer `npm audit fix` en premier
   - Si impossible, utiliser `overrides` dans `package.json` (si version corrigée existe)
   - Documenter dans ce fichier si correction non disponible
4. **Suivi :** Vérifier périodiquement si une correction est disponible

---

## Historique des corrections

_À compléter au fur et à mesure des corrections appliquées_

