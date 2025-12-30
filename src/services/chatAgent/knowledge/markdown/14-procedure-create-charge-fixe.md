# Procédure: `create_charge_fixe` — Créer une charge fixe

**Catégorie:** `procedures`  
**Mots-clés:** create_charge_fixe, procédure create_charge_fixe, charge fixe, abonnement, dépense mensuelle, mensuel, trimestriel, annuel, frequence, champ obligatoire, required_fields, ui_target, finance, POST /finance/charges-fixes

---

**intent:** `create_charge_fixe`  
**domain:** `finance`  
**ui_target:** `Menu Charges fixes`  
**required_fields:** `projet_id, montant, libelle, frequence`  
**enum_values.frequence:** `mensuel | trimestriel | annuel`  
**endpoint (backend):** `POST /finance/charges-fixes`

---

## Procédure (1 intention = 1 chunk)

1) `projet_id = contexte.projetId`  
2) Extraire `montant` (>0)  
3) Extraire `libelle` (obligatoire)  
4) Extraire `frequence` (mensuel/trimestriel/annuel)  
5) `date_debut` optionnel (défaut aujourd’hui)  
6) Appeler `POST /finance/charges-fixes`  
7) UI sync: rafraîchir la liste des charges fixes

---

## Exemples

- “charge fixe 15000 mensuel pour eau” → `montant=15000`, `libelle=Eau`, `frequence=mensuel`


