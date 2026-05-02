# Procédure: `create_visite_veterinaire` — Enregistrer une visite vétérinaire

**Catégorie:** `procedures`  
**Mots-clés:** create_visite_veterinaire, procédure create_visite_veterinaire, visite vétérinaire, veto, consultation, cout, diagnostic, prescriptions, ui_target, sante, champ obligatoire

---

**intent:** `create_visite_veterinaire`  
**domain:** `sante`  
**ui_target:** `Menu Santé > Visites vétérinaires`  
**required_fields:** `projet_id (depuis contexte)`  
**optional_fields:** `date_visite, veterinaire, motif, diagnostic, prescriptions, cout, notes`

---

## Procédure

1) `date_visite`: défaut aujourd’hui.  
2) Collecter infos optionnelles (motif, diagnostic, prescriptions).  
3) Si coût renseigné, valider numérique.  
4) Appeler l’API backend.  
5) UI sync: rafraîchir la liste des visites.


