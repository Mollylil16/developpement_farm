# Plan d'implémentation Backend

## 📋 Résumé
Ce document décrit l'implémentation backend pour les nouvelles fonctionnalités demandées :
1. Validation des vétérinaires avec documents (CNI, diplômes)
2. Module agricole avec 9 endpoints pour les données agricoles

## 🗂️ Structure

### 1. Migration SQL - Documents Vétérinaires
**Fichier**: `backend/database/migrations/066_add_veterinarian_validation_columns.sql`

Ajouter les colonnes suivantes à la table `users` pour les vétérinaires :
- `veterinarian_validation_status` : 'pending' | 'approved' | 'rejected'
- `cni_document_url` : URL du document CNI
- `diploma_document_url` : URL du document diplôme
- `cni_verified` : BOOLEAN (vérification manuelle)
- `diploma_verified` : BOOLEAN (vérification manuelle)
- `validation_reason` : Raison de validation/rejet
- `validated_at` : Date de validation
- `validated_by` : ID de l'admin qui a validé

### 2. Endpoints Admin - Validation Vétérinaires
**Fichier**: `backend/src/admin/admin.controller.ts` et `admin.service.ts`

Endpoints à ajouter :
- `GET /admin/users/veterinarians/validation` - Liste des vétérinaires à valider
- `POST /admin/users/veterinarians/:id/approve` - Approuver un vétérinaire
- `POST /admin/users/veterinarians/:id/reject` - Rejeter un vétérinaire
- `GET /admin/users/veterinarians/:id/documents` - Récupérer les documents

### 3. Module Agricole
**Nouveau module**: `backend/src/agricole/`

Structure :
- `agricole.module.ts`
- `agricole.controller.ts` 
- `agricole.service.ts`
- `dto/` (si nécessaire)

Endpoints à créer :
- `GET /admin/agricole/performances?period=month`
- `GET /admin/agricole/sante?period=month`
- `GET /admin/agricole/reproduction`
- `GET /admin/agricole/nutrition`
- `GET /admin/agricole/vaccination`
- `GET /admin/agricole/tracabilite`
- `GET /admin/agricole/economie`
- `GET /admin/agricole/cartographie`
- `GET /admin/agricole/certifications`

## 📝 Prochaines étapes

1. ✅ Créer migration SQL pour documents vétérinaires
2. ✅ Ajouter endpoints validation dans admin.controller.ts
3. ✅ Implémenter logique dans admin.service.ts
4. ✅ Créer module agricole
5. ✅ Implémenter endpoints agricoles
6. ✅ Ajouter module agricole dans app.module.ts
7. ✅ Tester les endpoints
