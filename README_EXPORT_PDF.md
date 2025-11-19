# 📄 Système d'Export PDF - Fermier Pro

## 🎯 Objectif

Permettre l'export en PDF des rapports suivants :
- ✅ **Vue d'ensemble (Dashboard)** : Rapport complet de l'exploitation
- ⏳ **Finance** : Détails complets des finances (Charges, Dépenses, Revenus)
- ⏳ **Rapports** : Indicateurs et tendances de performance

---

## 🚀 Installation Rapide

### Option 1 : Script Automatique (Windows)

```powershell
.\install-pdf-deps.ps1
```

### Option 2 : Script Automatique (Linux/Mac)

```bash
chmod +x install-pdf-deps.sh
./install-pdf-deps.sh
```

### Option 3 : Installation Manuelle

```bash
npx expo install expo-print expo-sharing
```

Puis redémarrez le serveur :

```bash
npx expo start --clear
```

---

## 📁 Structure des Fichiers

```
src/
├── services/
│   ├── pdfService.ts                    # Service principal (✅ Créé)
│   └── pdf/
│       ├── dashboardPDF.ts              # Template Dashboard (✅ Créé)
│       ├── financePDF.ts                # Template Finance (✅ Créé)
│       └── rapportsPDF.ts               # Template Rapports (✅ Créé)
│
├── screens/
│   ├── DashboardScreen.tsx              # ✅ Bouton export ajouté
│   ├── FinanceScreen.tsx                # ⏳ À modifier
│   └── RapportsScreen.tsx               # ⏳ À modifier
│
Documentation/
├── INSTALLATION_PDF.md                   # Guide complet d'utilisation
├── EXPORT_PDF_RECAP.md                   # Récapitulatif technique
├── install-pdf-deps.ps1                  # Script Windows
├── install-pdf-deps.sh                   # Script Linux/Mac
└── README_EXPORT_PDF.md                  # Ce fichier
```

---

## ✅ Ce qui a été fait

### 1. Service PDF Complet
- ✅ Génération de PDF à partir de HTML
- ✅ Partage via apps natives (Email, WhatsApp, etc.)
- ✅ Styles CSS professionnels
- ✅ Fonctions de formatage (devises, dates, nombres)
- ✅ En-têtes et pieds de page automatiques

### 2. Templates PDF Prêts à l'Emploi
- ✅ **Dashboard** : Vue complète avec finances, production, reproduction
- ✅ **Finance** : Charges, dépenses, revenus avec tableaux détaillés
- ✅ **Rapports** : KPIs, tendances, recommandations

### 3. Intégration Dashboard
- ✅ Bouton d'export (icône 📄) dans l'en-tête
- ✅ Fonction complète de génération
- ✅ Récupération automatique des données
- ✅ Calculs automatiques des statistiques
- ✅ Gestion des erreurs avec alerts

---

## ⏳ Ce qui reste à faire

### 1. Écran Finance
Ajouter un bouton d'export similaire au Dashboard dans l'écran de vue d'ensemble des finances.

**Voir** : `EXPORT_PDF_RECAP.md` section "Finance Screen"

### 2. Écran Rapports
Ajouter un bouton d'export dans l'écran des indicateurs et tendances.

**Voir** : `EXPORT_PDF_RECAP.md` section "Rapports Screen"

---

## 🎨 Fonctionnalités du Système

### ✨ PDFs Professionnels
- Design moderne et épuré
- Logo et branding Fermier Pro
- En-têtes et pieds de page automatiques
- Date de génération
- Mise en page optimisée pour A4

### 📊 Contenu Riche
- Tableaux formatés avec alternance de couleurs
- Statistiques en grille (3 colonnes)
- Badges de statut colorés
- Indicateurs visuels (✅, ⚠️, ❌)
- Sauts de page automatiques

### 🎯 Formatage Intelligent
- **Montants** : Format FCFA avec séparateurs
- **Dates** : Format français (ex: 15 novembre 2024)
- **Nombres** : Arrondis appropriés
- **Pourcentages** : Avec décimales

### 🔄 Partage Facile
- Export vers applications natives
- Partage par email, WhatsApp, etc.
- Impression directe
- Sauvegarde locale

---

## 📖 Documentation Complète

### Pour Utiliser les Templates

Consultez **`INSTALLATION_PDF.md`** pour :
- Exemples de code complets
- Description détaillée du contenu de chaque rapport
- Personnalisation des templates
- Conseils d'optimisation

### Pour les Développeurs

Consultez **`EXPORT_PDF_RECAP.md`** pour :
- État d'avancement technique
- Instructions d'intégration par écran
- Interfaces TypeScript
- Selectors à utiliser
- Erreurs courantes à éviter

---

## 🧪 Tests

### Test Dashboard (✅ Prêt)

1. Ouvrir l'application
2. Aller sur le Dashboard
3. Cliquer sur le bouton 📄 (en haut à droite)
4. Vérifier :
   - ✅ PDF généré sans erreur
   - ✅ Contenu complet et correct
   - ✅ Partage fonctionne
   - ✅ Impression possible

### Tests Finance et Rapports (⏳ En attente)

Attendre l'intégration des boutons d'export.

---

## 💡 Conseils d'Utilisation

### Performance
- Les PDFs se génèrent en 2-5 secondes
- Pas besoin de connexion internet
- Les données sont chargées depuis le store Redux

### Données
- Seuls les animaux actifs sont inclus par défaut
- Les tableaux sont limités à 20-30 entrées pour la lisibilité
- Les totaux et moyennes sont calculés automatiquement

### Personnalisation
- Modifier `PDF_COMMON_STYLES` dans `pdfService.ts` pour changer l'apparence globale
- Ajuster les templates individuels pour le contenu
- Les couleurs suivent le thème de l'application

---

## 🐛 Dépannage

### Erreur : "expo-print not found"
```bash
npx expo install expo-print
npx expo start --clear
```

### Erreur : "Cannot share file"
- Vérifier que `expo-sharing` est installé
- Sur Android : Vérifier les permissions
- Sur iOS : Vérifier les permissions dans Info.plist

### Erreur : "TypeError: Cannot read property..."
- Vérifier que les données existent avant la génération
- Ajouter des vérifications null/undefined
- Consulter la console pour les détails

### PDF vide ou incomplet
- Vérifier que le projet actif est chargé
- Vérifier que les données sont dans le store
- Utiliser `console.log` pour debugger les données

---

## 🎊 Avantages

- ✅ **Professionnel** : PDFs de qualité bancaire
- ✅ **Rapide** : Génération en quelques secondes
- ✅ **Hors ligne** : Pas besoin de connexion
- ✅ **Universel** : Fonctionne sur iOS et Android
- ✅ **Partageable** : Compatible toutes apps
- ✅ **Archivable** : Historique des rapports
- ✅ **Imprimable** : Prêt pour l'impression

---

## 📞 Support

Pour toute question ou problème :
1. Consulter `INSTALLATION_PDF.md`
2. Consulter `EXPORT_PDF_RECAP.md`
3. Vérifier les logs de la console
4. Contacter le support technique

---

## 🎯 Roadmap

### Version 1.0 (Actuelle)
- ✅ Service PDF de base
- ✅ Template Dashboard
- ✅ Template Finance
- ✅ Template Rapports
- ✅ Intégration Dashboard

### Version 1.1 (À venir)
- ⏳ Intégration Finance
- ⏳ Intégration Rapports
- ⏳ Tests complets

### Version 2.0 (Futur)
- 📅 Sélecteur de plage de dates
- 📅 Graphiques dans les PDFs
- 📅 Templates personnalisables
- 📅 Envoi email direct
- 📅 Aperçu avant génération

---

**Date de création** : 17 novembre 2024  
**Version** : 1.0  
**Statut** : ✅ Dashboard | ⏳ Finance | ⏳ Rapports  
**Compatibilité** : Expo SDK 49+, iOS 13+, Android 8+

