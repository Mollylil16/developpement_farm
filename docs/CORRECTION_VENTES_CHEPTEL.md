# 🔧 Correction : Validation Stricte des Ventes et Mise à Jour du Cheptel

## 📋 Problème Identifié

Actuellement, il est possible d'enregistrer un revenu lié à la vente de porcs sans identifier les sujets vendus, ce qui génère des données incohérentes dans le cheptel.

## ✅ Solutions Implémentées

### 1. Backend - Nouvel Endpoint avec Validation Stricte

**Fichier** : `backend/src/finance/dto/create-vente-porc.dto.ts`
- Nouveau DTO `CreateVentePorcDto` avec validation stricte
- Mode individuel : `animal_ids` (obligatoire)
- Mode bande : `batch_id` + `quantite` (obligatoires)

**Fichier** : `backend/src/finance/finance.service.ts`
- Nouvelle méthode `createVentePorc()` qui :
  - Valide que les sujets sont identifiés
  - Vérifie que les animaux existent et sont actifs
  - Met à jour automatiquement le cheptel (statut "vendu", date_vente)
  - Supprime les porcs de `batch_pigs` en mode bande
  - Crée le revenu avec toutes les informations

**Fichier** : `backend/src/finance/finance.controller.ts`
- Nouvel endpoint `POST /finance/ventes-porcs`

### 2. Frontend - À Implémenter

**Fichier** : `src/components/RevenuFormModal.tsx`
- Détecter si `categorie === 'vente_porc'`
- Si oui, rendre obligatoire l'identification des sujets :
  - Mode individuel : Sélecteur multi-ID des animaux actifs
  - Mode bande : Sélecteur de batch + champ quantité
- Utiliser le nouvel endpoint `/finance/ventes-porcs` au lieu de `/finance/revenus`
- Bloquer la soumission si les sujets ne sont pas identifiés

**Fichier** : `src/services/chatAgent/actions/finance/RevenuActions.ts`
- Modifier `createRevenu()` pour :
  - Détecter si c'est une vente de porc
  - Si oui, vérifier si `animal_ids` ou `batch_id + quantite` sont fournis
  - Si non, retourner un état de clarification avec message spécifique
  - Utiliser le nouvel endpoint `/finance/ventes-porcs`

**Fichier** : `src/services/chatAgent/core/ClarificationService.ts`
- Ajouter un état `demande_identification_sujets` qui :
  - En mode individuel : demande les IDs des animaux
  - En mode bande : demande la loge et la quantité
  - Boucle jusqu'à obtention des informations

### 3. Frontend - Actions Kouakou

**Fichier** : `src/services/chatAgent/actions/finance/RevenuActions.ts`
- Modifié `createRevenu()` pour :
  - Détecter si `categorie === 'vente_porc'`
  - Récupérer le mode de gestion du projet (`management_method`)
  - Vérifier si les sujets sont identifiés (`animal_ids` ou `batch_id + quantite`)
  - Si non identifiés, retourner un état de clarification avec message spécifique selon le mode
  - Utiliser le nouvel endpoint `/finance/ventes-porcs` pour les ventes de porcs
  - Utiliser l'endpoint classique `/finance/revenus` pour les autres catégories

## 📝 Prochaines Étapes

1. ✅ Backend endpoint créé
2. ✅ Backend service avec mise à jour automatique du cheptel
3. ✅ RevenuActions (Kouakou) modifié pour demander l'identification
4. ⏳ Modifier RevenuFormModal pour utiliser le nouvel endpoint et rendre obligatoire l'identification
5. ⏳ Modifier le système de clarification pour gérer l'état `demande_identification_sujets` et permettre la boucle
6. ⏳ Tester les deux modes (individuel et bande)

---

**Date** : 2025-01-XX
**Statut** : En cours d'implémentation (Backend et Kouakou terminés, Frontend formulaire en cours)

