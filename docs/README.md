# 📚 Documentation - Fermier Pro

**Date:** 21 Novembre 2025

---

## 📂 Structure

```
docs/
├── README.md                    # Ce fichier - Index documentation
├── CONTEXT.md                   # Architecture globale du projet
│
├── architecture/                # 🏗️ Documentation architecture (Nouveau !)
│   ├── README.md               # Index architecture
│   ├── overview.md             # Vue d'ensemble
│   ├── decisions/              # Architecture Decision Records (ADRs)
│   │   ├── 001-repository-pattern.md
│   │   ├── 002-redux-toolkit.md
│   │   ├── 003-lazy-loading.md
│   │   └── 004-feature-flags.md
│   └── references/             # Références vers archive
│
├── opex-capex/                  # 💰 Système OPEX/CAPEX
│   ├── OPEX_CAPEX_STATUS_FINAL.md
│   ├── OPEX_CAPEX_IMPLEMENTATION_PLAN.md
│   ├── OPEX_CAPEX_INTEGRATION_GUIDE.md
│   ├── INTEGRATION_DB_OPEX_CAPEX.md
│   └── TESTS_MANUELS_OPEX_CAPEX.md
│
├── archive/                     # 📦 Historique développement
│   ├── PHASE3_REPOSITORIES_SUMMARY.md
│   ├── PHASE4_MIGRATION_SLICES_COMPLETE.md
│   ├── PHASE5_UI_REFACTORING_COMPLETE.md
│   ├── REFACTORING_SUMMARY.md
│   └── ... (129 documents)
│
└── guides/                      # 📖 Guides techniques
    ├── FEATURE_FLAGS.md        # Feature Flags & A/B Testing
    ├── LAZY_LOADING.md         # Lazy Loading & Code Splitting
    ├── DEPENDENCY_MANAGEMENT.md # Gestion des dépendances
    ├── MIGRATION_REPOSITORIES.md
    └── ...
```

---

## 🎯 Navigation Rapide

### Pour les Nouveaux
1. **Racine:** [../README.md](../README.md) - Vue d'ensemble projet
2. **Racine:** [../DOCUMENTATION.md](../DOCUMENTATION.md) - Index complet
3. **Racine:** [../README_OPEX_CAPEX.md](../README_OPEX_CAPEX.md) - Système OPEX/CAPEX

### Pour les Développeurs
1. **Architecture:** [architecture/](architecture/) - Documentation architecture centralisée
2. **Contexte technique:** [CONTEXT.md](CONTEXT.md)
3. **OPEX/CAPEX:** [opex-capex/](opex-capex/)
4. **Guides:** [guides/](guides/)

### Pour l'Historique
1. **Archive:** [archive/](archive/)

---

## 💰 Système OPEX/CAPEX (Prioritaire)

**Dossier:** [opex-capex/](opex-capex/)

Système complet de gestion financière avec :
- Classification automatique OPEX/CAPEX
- Amortissement des investissements
- Calcul coûts de production
- Marges automatiques par vente
- Dashboard et graphiques

**⚠️ Action requise:** Intégrer la migration DB avant utilisation

**Documents:**
1. **OPEX_CAPEX_STATUS_FINAL.md** - Status et statistiques
2. **OPEX_CAPEX_IMPLEMENTATION_PLAN.md** - Plan technique
3. **OPEX_CAPEX_INTEGRATION_GUIDE.md** - Guide pratique
4. **INTEGRATION_DB_OPEX_CAPEX.md** - Migration DB (CRITIQUE)
5. **TESTS_MANUELS_OPEX_CAPEX.md** - Tests fonctionnels

---

## 📦 Archives

**Dossier:** [archive/](archive/)

Historique complet du développement :

### Phases de Refactoring
- Phase 1: Configuration Jest, ESLint, Prettier
- Phase 2: Refactoring Database (Repositories)
- Phase 3: Migration Redux Slices
- Phase 4: Refactoring UI (Custom Hooks)
- Phase 5: Nettoyage Code
- Phase 6: Documentation

### Sessions de Développement
- Sessions 21 Novembre 2025
- Progressions et status
- Corrections et améliorations

### Fonctionnalités Spécifiques
- Modification ingrédients rations
- Pull-to-refresh
- Corrections VirtualizedList
- Etc.

**Note:** Ces documents sont conservés pour référence historique.

---

## 📖 Guides Techniques

**Dossier:** [guides/](guides/)

- Migration vers Repositories
- Guide tests unitaires
- Et autres guides techniques

---

## 🔗 Liens Rapides

**À la racine du projet:**
- [README.md](../README.md)
- [DOCUMENTATION.md](../DOCUMENTATION.md)
- [README_OPEX_CAPEX.md](../README_OPEX_CAPEX.md)

**Documentation:**
- [CONTEXT.md](CONTEXT.md) - Architecture
- [opex-capex/](opex-capex/) - Système OPEX/CAPEX
- [archive/](archive/) - Historique
- [guides/](guides/) - Guides techniques

---

**Dernière mise à jour:** 21 Novembre 2025  
📚 **Bonne lecture !**
