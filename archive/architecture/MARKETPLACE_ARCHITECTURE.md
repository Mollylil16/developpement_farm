# Architecture Marketplace - Plan d'Implémentation

## Vue d'ensemble

Ce document décrit l'architecture complète du système Marketplace avec agrégation par ferme, système de notifications amélioré, et restrictions multi-rôles.

## 1. Agrégation des Listings par Ferme

### Service d'Agrégation

**Fichier**: `src/services/MarketplaceService.ts`

Méthode `groupListingsByFarm()` créée pour :
- Grouper les listings par `farmId`
- Calculer les données agrégées (poids total, prix min/max, moyenne)
- Récupérer les informations du producteur et de la ferme
- Calculer les ratings et badges
- Calculer la distance depuis l'acheteur

### Types

**Fichier**: `src/types/marketplace.ts`

Interface `FarmCard` étendue avec :
- `aggregatedData`: Données agrégées de tous les sujets
- `producerRating`: Notes du producteur
- `badges`: Badges (nouveau, certifié, réponse rapide)
- `preview`: Aperçu (photos, races disponibles)

## 2. Modal de Détails des Sujets

### Composant à créer

**Fichier**: `src/components/marketplace/FarmDetailsModal.tsx`

Fonctionnalités :
- Header fixe avec nom ferme et compteur de sélection
- Barre de filtres (race, tri, recherche)
- Liste scrollable des sujets avec checkboxes
- Accordéon détails sanitaires par sujet
- Footer fixe avec récapitulatif et bouton d'action

### Détails sanitaires

Affichage pour chaque sujet :
- Historique vétérinaire
- Vaccinations (à jour ou non)
- Prophylaxie
- Lien vers certificat sanitaire

## 3. Système de Notifications Amélioré

### Panel de Notifications

**Fichier**: `src/components/marketplace/NotificationPanel.tsx`

Fonctionnalités :
- Dropdown depuis l'icône cloche
- Onglets (Toutes, Offres, Messages, Système)
- Actions rapides par notification
- Marquage automatique comme lu
- Groupement par type/sender

### Intégration Chat

Clic sur "Chat" depuis notification :
- Ferme le panel
- Ouvre le chat avec contexte
- Charge la conversation pertinente

## 4. Restrictions Multi-Rôles

### Service de Permissions

**Fichier**: `src/services/MarketplacePermissions.ts`

Vérifications :
- Un utilisateur ne peut pas voir ses propres listings
- Un utilisateur ne peut pas faire d'offre sur ses propres listings
- Vérification basée sur `producerId` et `farmId`

## 5. Amélioration FarmCard

**Fichier**: `src/components/marketplace/FarmCard.tsx`

À améliorer :
- Afficher les nouvelles propriétés agrégées
- Afficher les badges
- Afficher les races disponibles
- Afficher la plage de prix

## Prochaines Étapes

1. ✅ Service d'agrégation créé
2. ⏳ Restaurer le fichier types/marketplace.ts complet
3. ⏳ Créer FarmDetailsModal
4. ⏳ Améliorer FarmCard
5. ⏳ Créer NotificationPanel
6. ⏳ Implémenter restrictions multi-rôles

