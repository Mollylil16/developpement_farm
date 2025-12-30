# Procédure: `create_revenu` — Enregistrer une vente (revenu)

**Catégorie:** `procedures`  
**Mots-clés:** create_revenu, procédure create_revenu, revenu, vente, vendu, vendre, montant, nombre, acheteur, poids_kg, champ obligatoire, required_fields, ui_target, finance, POST /finance/revenus

---

**intent:** `create_revenu`  
**domain:** `finance`  
**ui_target:** `Menu Revenus / Ventes`  
**required_fields:** `projet_id, montant, date`  
**enum_values.categorie (typique):** `vente_porc`  
**endpoint (backend):** `POST /finance/revenus`

---

## Procédure (1 intention = 1 chunk)

1) `projet_id = contexte.projetId`
2) Extraire `montant` (> 0).  
3) `date`: défaut aujourd’hui (YYYY-MM-DD).  
4) Optionnels: `nombre` (par défaut 1), `acheteur` (par défaut “client”), `poids_kg`, `animal_id`.
5) Appel API `POST /finance/revenus` avec:
- `projet_id, montant, categorie (vente_porc), date, description, commentaire, poids_kg, animal_id`
6) UI sync: rafraîchir les revenus puis confirmer l’emplacement dans le menu.

---

## Exemples

- “j’ai vendu 5 porcs à 800000” → `montant=800000`, `nombre=5`, `categorie=vente_porc`
- “vendu P001 à 150000” → `montant=150000`, `animal_id` (si fourni) ou description


