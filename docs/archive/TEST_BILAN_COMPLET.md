# 🧪 Guide de Test - Bilan Financier Complet

## Prérequis

1. ✅ Migration exécutée : `053_create_dettes_table.sql`
2. ✅ Backend démarré : `npm run start:dev` dans `backend/`
3. ✅ Base de données connectée et accessible

---

## Test 1 : Vérification de la Table Dettes

```bash
# Se connecter à PostgreSQL
psql -U farmtrack_user -d farmtrack_db

# Vérifier que la table existe
\dt dettes

# Vérifier la structure
\d dettes

# Sortir
\q
```

---

## Test 2 : Test de l'Endpoint via l'Application

### Via l'Application React Native

1. **Démarrer l'application** (Expo)
2. **Se connecter** avec un compte utilisateur
3. **Aller dans Finance > Bilan**
4. **Vérifier :**
   - ✅ Le composant se charge
   - ✅ Les données s'affichent
   - ✅ Les graphiques sont visibles
   - ✅ Les filtres de période fonctionnent
   - ✅ Les exports PDF/Excel fonctionnent

---

## Test 3 : Test de l'Endpoint via API (avec authentification)

### Étape 1 : Obtenir un Token JWT

```bash
# Se connecter via l'API
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "votre_email@example.com",
    "password": "votre_mot_de_passe"
  }'

# Réponse attendue :
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": { ... }
# }
```

### Étape 2 : Tester l'Endpoint Bilan Complet

```bash
# Remplacer <TOKEN> par le token obtenu
# Remplacer <PROJET_ID> par l'ID d'un projet existant

curl -X GET "http://localhost:3000/finance/bilan-complet?projet_id=<PROJET_ID>&date_debut=2025-01-01&date_fin=2025-12-31" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

### Réponse Attendue

```json
{
  "periode": {
    "date_debut": "2025-01-01T00:00:00.000Z",
    "date_fin": "2025-12-31T23:59:59.999Z",
    "nombre_mois": 12
  },
  "revenus": {
    "total": 5000000,
    "par_categorie": {
      "vente_porc": 4500000,
      "autre": 500000
    },
    "nombre_transactions": 15
  },
  "depenses": {
    "opex_total": 3000000,
    "charges_fixes_total": 500000,
    "total": 3500000,
    "par_categorie": {
      "alimentation": 2000000,
      "sante": 500000,
      "autre": 500000
    },
    "nombre_transactions": 50
  },
  "dettes": {
    "total": 1000000,
    "nombre": 2,
    "interets_mensuels": 8333.33,
    "liste": [
      {
        "id": "...",
        "libelle": "Prêt bancaire",
        "montant_restant": 800000,
        "date_echeance": "2026-06-30",
        "taux_interet": 5
      }
    ]
  },
  "actifs": {
    "valeur_cheptel": 2000000,
    "valeur_stocks": 300000,
    "total": 2300000,
    "nombre_animaux": 50,
    "poids_moyen_cheptel": 40.5
  },
  "resultats": {
    "solde": 1500000,
    "marge_brute": 2000000,
    "cash_flow": 1491666.67
  },
  "indicateurs": {
    "taux_endettement": 43.48,
    "ratio_rentabilite": 30.0,
    "cout_kg_opex": 1500,
    "total_kg_vendus": 2000
  }
}
```

---

## Test 4 : Test via Script TypeScript

Un script de test a été créé : `backend/scripts/test-bilan-complet.ts`

### Utilisation

```bash
cd backend

# Test avec projet_id (dates par défaut : début du mois actuel à aujourd'hui)
tsx scripts/test-bilan-complet.ts <PROJET_ID>

# Test avec dates personnalisées
tsx scripts/test-bilan-complet.ts <PROJET_ID> 2025-01-01 2025-12-31
```

**Note :** Ce script nécessite que le backend soit démarré et accessible. Pour l'authentification, vous devrez peut-être modifier le script pour inclure un token JWT valide.

---

## Test 5 : Test des Exports

### Export PDF

1. Dans l'application, aller dans **Finance > Bilan**
2. Cliquer sur le bouton **"Exporter en PDF"**
3. Vérifier :
   - ✅ Le PDF se génère
   - ✅ Toutes les sections sont présentes
   - ✅ Le format est professionnel et bancable

### Export Excel

1. Dans l'application, aller dans **Finance > Bilan**
2. Cliquer sur le bouton **"Exporter en Excel"**
3. Vérifier :
   - ✅ Le fichier CSV se génère
   - ✅ Il peut être ouvert dans Excel
   - ✅ Toutes les sections sont présentes

---

## Test 6 : Test Kouakou

### Questions à poser à Kouakou

1. **"Donne-moi le bilan financier"**
   - ✅ Kouakou doit répondre avec un résumé complet
   - ✅ Inclure revenus, dépenses, dettes, actifs, indicateurs

2. **"Quel est mon bilan pour le mois précédent ?"**
   - ✅ Kouakou doit utiliser `get_bilan_financier` avec `periode: 'mois_precedent'`

3. **"Quelles sont mes dettes en cours ?"**
   - ✅ Kouakou doit utiliser `get_dettes_en_cours`
   - ✅ Lister toutes les dettes avec échéances

4. **"Bilan du trimestre"**
   - ✅ Kouakou doit utiliser `get_bilan_financier` avec `periode: 'trimestre'`

---

## Checklist de Validation

### Backend
- [ ] Migration `053_create_dettes_table.sql` exécutée
- [ ] Table `dettes` existe dans la base de données
- [ ] Endpoint `GET /finance/bilan-complet` répond correctement
- [ ] Endpoint `GET /finance/dettes` répond correctement
- [ ] Endpoint `POST /finance/dettes` crée une dette
- [ ] Calculs automatiques fonctionnent (valeur cheptel, stocks, etc.)

### Frontend
- [ ] Composant `FinanceBilanCompletComponent` s'affiche
- [ ] Toutes les sections sont visibles
- [ ] Graphiques s'affichent correctement
- [ ] Filtres de période fonctionnent
- [ ] Export PDF fonctionne
- [ ] Export Excel fonctionne
- [ ] Pull-to-refresh fonctionne

### Kouakou
- [ ] Action `get_bilan_financier` fonctionne
- [ ] Action `get_dettes_en_cours` fonctionne
- [ ] Kouakou comprend les questions sur le bilan
- [ ] Réponses sont complètes et précises

---

## Dépannage

### Erreur : "Table dettes does not exist"
**Solution :** Exécuter la migration : `tsx scripts/run-single-migration.ts 053_create_dettes_table.sql`

### Erreur : "401 Unauthorized"
**Solution :** Vérifier que vous êtes authentifié et que le token JWT est valide

### Erreur : "404 Not Found"
**Solution :** Vérifier que le backend est démarré et accessible sur le port 3000

### Erreur : "500 Internal Server Error"
**Solution :** Vérifier les logs du backend pour plus de détails

---

## Notes

- Les calculs de valeur cheptel nécessitent des données de pesées récentes
- Les calculs de valeur stocks nécessitent des données de stocks d'aliments
- Les dettes doivent être créées via l'API ou l'interface pour apparaître dans le bilan

