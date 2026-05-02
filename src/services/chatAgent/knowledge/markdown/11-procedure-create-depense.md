# Procédure: `create_depense` — Enregistrer une dépense

**Catégorie:** `procedures`  
**Mots-clés:** create_depense, procedure, procédure create_depense, depense, dépense, acheter, achat, payer, paiement, coût, cout, aliment, 500000, 500.000, 500 000, aliment 500000, provende, nourriture, vétérinaire, veto, medicaments, vaccins, categorie, champ obligatoire, required_fields, enum_values, ui_target, finance, POST /finance/depenses-ponctuelles

---

**intent:** `create_depense`  
**domain:** `finance`  
**ui_target:** `Menu Dépenses`  
**required_fields:** `projet_id, montant, categorie, date`  
**enum_values.categorie (backend):** `vaccins | medicaments | alimentation | veterinaire | entretien | equipements | amenagement_batiment | equipement_lourd | achat_sujet | autre`  
**endpoint (backend):** `POST /finance/depenses-ponctuelles`

---

## Objectif

Créer une dépense ponctuelle rattachée au **projet actif** afin qu’elle apparaisse dans le **menu Dépenses**.

---

## Règle RAG-GATE (obligatoire)

Avant d’exécuter l’action, Kouakou doit consulter la base de connaissances et vérifier :
- la **catégorie backend** autorisée (`enum_values.categorie`)
- les **champs obligatoires** (`required_fields`)
- les **exemples similaires** (ex: “aliment 500000”)

---

## Procédure (1 intention = 1 chunk)

1) **Identifier le projet**
- Utiliser `projet_id = contexte.projetId` (projet actif).

2) **Extraire et valider le montant**
- Le montant doit être un **nombre > 0**.
- Supporter formats: `500000`, `500 000`, `500.000` (milliers), `500,000`.

3) **Déterminer la catégorie backend**
- Mapper le langage naturel vers une catégorie backend :
  - “aliment”, “provende”, “nourriture” → `alimentation`
  - “médicament”, “médoc” → `medicaments`
  - “vaccin”, “vaccination” → `vaccins`
  - “véto”, “vétérinaire”, “consultation” → `veterinaire`
  - “entretien”, “réparation” → `entretien`
  - “équipement”, “matériel” → `equipements`
  - “construction”, “bâtiment”, “aménagement” → `amenagement_batiment`
  - “machine”, “équipement lourd” → `equipement_lourd`
  - “achat porc”, “achat sujet”, “achat animal” → `achat_sujet`

4) **Date**
- Si absente: utiliser **aujourd’hui** au format `YYYY-MM-DD`.

5) **Libellé / Commentaire**
- `commentaire` optionnel.
- Si `categorie = autre`, renseigner `libelle_categorie` (obligatoire pour “autre”).

6) **Appel API**

Payload attendu:
- `projet_id` (string)
- `montant` (number)
- `categorie` (enum backend)
- `date` (YYYY-MM-DD)
- `commentaire` (optionnel)
- `libelle_categorie` (optionnel, requis si `categorie=autre`)

7) **UI sync**
- Après succès, rafraîchir la liste: `GET /finance/depenses-ponctuelles?projet_id=...`
- Confirmer à l’utilisateur que la dépense est visible dans **Menu Dépenses**.

---

## Exemples (few-shot)

### Exemple A — Aliment (cas obligatoire)
Utilisateur: “Kouakou enregistre 500000 fr dépense aliment”  
Action: `create_depense`  
Valeurs:
- `montant = 500000`
- `categorie = alimentation`
- `date = aujourd’hui`

### Exemple B — Vétérinaire
Utilisateur: “j’ai payé le véto 25000”  
Valeurs:
- `montant = 25000`
- `categorie = veterinaire`

### Exemple C — Catégorie non supportée → `autre`
Utilisateur: “j’ai dépensé 10000 pour salaire gardien”  
Valeurs:
- `montant = 10000`
- `categorie = autre`
- `libelle_categorie = salaires/gardien`


