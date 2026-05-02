-- Migration 058: Peupler la base de connaissances avec du contenu de formation
-- Contenu initial pour Kouakou basé sur TrainingKnowledgeBase

-- ============================================
-- SEED DATA: Base de connaissances sur l'élevage porcin
-- ============================================

-- Types d'élevage
INSERT INTO knowledge_base (id, category, title, keywords, content, summary, priority, visibility) VALUES
('kb_types_elevage', 'types_elevage', 'Types d''élevage porcin', 
 ARRAY['type', 'élevage', 'naisseur', 'engraisseur', 'cycle complet', 'charcuterie', 'production', 'porcelets', 'sevrage'],
 '**Les 4 types principaux d''élevage porcin:**

🐷 **1. Naisseur (Production de porcelets)**
- Cycle: Saillie → Gestation (114j) → Mise bas → Sevrage (21-28j)
- Avantages: Marge élevée, moins d''espace
- Inconvénients: Expertise technique, mortalité périnatale
- Rentabilité: Bonne si taux survie > 90%

🐖 **2. Engraisseur uniquement**
- Cycle: Achat porcelets → Croissance (180j) → Vente
- Avantages: Cycle court, gestion simple, investissement moyen
- Inconvénients: Dépendance aux naisseurs
- Rentabilité: Stable avec GMQ > 700g/jour

🥓 **3. Production charcuterie**
- Poids élevé: 120-150 kg
- Avantages: Valeur ajoutée, marché de niche
- Rentabilité: Excellente avec transformation

♻️ **4. Cycle complet (Naisseur-Engraisseur)**
- De la saillie à la vente
- Avantages: Autonomie totale, meilleure marge
- Inconvénients: Complexité, investissement élevé',
 'Il existe 4 types d''élevage porcin: naisseur, engraisseur, charcuterie et cycle complet. Chacun a ses avantages selon votre capital et expertise.',
 10, 'global')
ON CONFLICT (id) DO UPDATE SET 
  content = EXCLUDED.content, 
  summary = EXCLUDED.summary,
  keywords = EXCLUDED.keywords,
  updated_at = NOW();

-- Objectifs
INSERT INTO knowledge_base (id, category, title, keywords, content, summary, priority, visibility) VALUES
('kb_objectifs', 'objectifs', 'Définir son objectif d''élevage',
 ARRAY['objectif', 'capital', 'investissement', 'budget', 'surface', 'marché', 'temps', 'démarrer', 'commencer'],
 '**Comment définir un objectif clair:**

💰 **Selon le capital disponible:**
- < 2M FCFA → Engraissement 10-20 porcs
- 2-5M FCFA → Naisseur avec 5-10 truies
- > 5M FCFA → Cycle complet

📐 **Selon la surface:**
- 100m² minimum pour 20 porcs engraissement
- 200-300m² pour naisseur (5-10 truies)
- > 500m² pour cycle complet

⏰ **Selon le temps disponible:**
- Temps partiel (2h/jour) → Engraissement
- Mi-temps (4h/jour) → Naisseur
- Temps plein → Cycle complet

🎯 **Marché cible:**
- Particuliers → 90-100 kg
- Restaurants/Hôtels → 100-120 kg
- Charcutiers → 120-150 kg
- Naisseurs → Porcelets sevrés

💡 **Exemple objectif bien défini:**
"Produire 60 porcs/an (3 bandes de 20) pour vendre à 110 kg, marge nette 1,5M FCFA/an"',
 'Définissez votre objectif selon votre capital (2-5M pour naisseur), surface disponible et temps. L''engraissement est idéal pour débuter.',
 9, 'global')
ON CONFLICT (id) DO UPDATE SET 
  content = EXCLUDED.content, 
  summary = EXCLUDED.summary,
  keywords = EXCLUDED.keywords,
  updated_at = NOW();

-- Races
INSERT INTO knowledge_base (id, category, title, keywords, content, summary, priority, visibility) VALUES
('kb_races', 'races', 'Choix de la race porcine',
 ARRAY['race', 'large white', 'landrace', 'duroc', 'piétrain', 'croisement', 'génétique', 'truie', 'verrat', 'hampshire'],
 '**Choisir la bonne race selon vos objectifs:**

🐷 **Pour production de porcelets:**

**Large White**
- Prolificité: 11-13 porcelets/portée
- Qualités maternelles: Excellentes
- Prix: 150 000-200 000 FCFA/truie

**Landrace**
- Prolificité: 10-12 porcelets/portée
- Excellente longueur carcasse
- Prix: 140 000-180 000 FCFA/truie

🐖 **Pour engraissement:**

**Duroc**
- GMQ: 750-850 g/jour
- Excellente qualité de viande
- Rusticité élevée

**Piétrain**
- GMQ: 700-800 g/jour
- Taux de muscle très élevé
- Sensible au stress

🔄 **Croisements recommandés:**
- Large White x Landrace (truie F1)
- F1 x Duroc ou Piétrain (porcs charcutiers)

💡 **Conseil:** Privilégiez les croisements pour combiner les avantages de chaque race.',
 'Les meilleures races sont Large White et Landrace pour la reproduction, Duroc et Piétrain pour l''engraissement. Les croisements combinent les avantages.',
 9, 'global')
ON CONFLICT (id) DO UPDATE SET 
  content = EXCLUDED.content, 
  summary = EXCLUDED.summary,
  keywords = EXCLUDED.keywords,
  updated_at = NOW();

-- Alimentation
INSERT INTO knowledge_base (id, category, title, keywords, content, summary, priority, visibility) VALUES
('kb_alimentation', 'alimentation', 'Alimentation des porcs',
 ARRAY['aliment', 'nourriture', 'provende', 'maïs', 'soja', 'ration', 'nourrir', 'farine', 'quantité', 'repas'],
 '**Guide complet de l''alimentation porcine:**

🍽️ **Besoins par stade:**

**Porcelet (10-30 kg)**
- Aliment: Starter/Premier âge
- Consommation: 0.5-1.5 kg/jour
- Protéines: 18-20%
- Coût: ~400 FCFA/kg

**Croissance (30-70 kg)**
- Aliment: Croissance
- Consommation: 2-2.5 kg/jour
- Protéines: 16-17%
- Coût: ~300 FCFA/kg

**Finition (70-110 kg)**
- Aliment: Finition
- Consommation: 2.5-3.5 kg/jour
- Protéines: 14-15%
- Coût: ~250 FCFA/kg

**Truie gestante**
- Consommation: 2.5-3 kg/jour
- Protéines: 14-16%

**Truie allaitante**
- Consommation: 5-7 kg/jour (à volonté)
- Protéines: 17-18%

📊 **Indice de consommation cible:**
- Engraissement: 2.8-3.2 kg aliment / kg gain
- Plus l''IC est bas, meilleure est la rentabilité

💰 **Économie:** L''aliment représente 65-70% du coût de production',
 'L''alimentation représente 65-70% des coûts. Un porcelet consomme 0.5-1.5 kg/j, un porc en finition 2.5-3.5 kg/j. Visez un IC de 2.8-3.2.',
 10, 'global')
ON CONFLICT (id) DO UPDATE SET 
  content = EXCLUDED.content, 
  summary = EXCLUDED.summary,
  keywords = EXCLUDED.keywords,
  updated_at = NOW();

-- Santé
INSERT INTO knowledge_base (id, category, title, keywords, content, summary, priority, visibility) VALUES
('kb_sante', 'sante', 'Santé et prophylaxie porcine',
 ARRAY['vaccin', 'vaccination', 'maladie', 'santé', 'traitement', 'vétérinaire', 'prophylaxie', 'peste', 'vermifuge', 'fer'],
 '**Programme sanitaire recommandé:**

💉 **Calendrier vaccinal porcelets:**

**Jour 3:**
- Fer dextran (prévention anémie)
- Coupe queue (optionnel)

**Jour 7-10:**
- Mycoplasme (1ère dose)
- Circovirus PCV2 (si zone à risque)

**Jour 21:**
- Mycoplasme (rappel)

**Semaine 8-10:**
- Rouget
- Parvovirose (futurs reproducteurs)

💉 **Truies reproductrices:**
- Rouget: rappel tous les 6 mois
- Parvovirose: avant saillie
- E. coli/Clostridium: avant mise bas

🦠 **Maladies à surveiller:**
- PPA (Peste Porcine Africaine): Mortelle, pas de vaccin
- Rouget: Taches rouges, forte fièvre
- Gale: Démangeaisons, croûtes
- Vers: Retard croissance, poil piqué

🔒 **Biosécurité:**
- Pédiluve à l''entrée
- Quarantaine nouveaux animaux (3 semaines)
- Désinfection entre bandes
- Limiter les visiteurs',
 'Vaccinez au J3 (fer), J7-10 (mycoplasme), J21 (rappel). Truies: rouget et parvovirose. Respectez la biosécurité contre la PPA.',
 10, 'global')
ON CONFLICT (id) DO UPDATE SET 
  content = EXCLUDED.content, 
  summary = EXCLUDED.summary,
  keywords = EXCLUDED.keywords,
  updated_at = NOW();

-- Reproduction
INSERT INTO knowledge_base (id, category, title, keywords, content, summary, priority, visibility) VALUES
('kb_reproduction', 'sante', 'Reproduction porcine',
 ARRAY['reproduction', 'saillie', 'insémination', 'truie', 'verrat', 'chaleur', 'gestation', 'mise bas', 'portée', 'porcelet'],
 '**Guide de la reproduction porcine:**

🔥 **Détection des chaleurs:**
- Signes: Vulve rouge/gonflée, immobilité au test du dos
- Durée: 48-72 heures
- Cycle: Tous les 21 jours
- Meilleur moment: 12-24h après début des signes

🐗 **Saillie/Insémination:**
- Ratio: 1 verrat pour 15-20 truies
- 2 saillies espacées de 12-24h recommandées
- Durée saillie: 5-15 minutes

🤰 **Gestation:**
- Durée: 114 jours (3 mois, 3 semaines, 3 jours)
- Diagnostic: Échographie à J21-28, ou non-retour en chaleur à J21
- Alimentation: 2.5-3 kg/jour

👶 **Mise bas:**
- Signes avant-coureurs: Montée de lait 24h avant, nidification
- Durée: 2-6 heures pour toute la portée
- Intervalle entre porcelets: 15-30 minutes
- Surveiller: Expulsion du placenta dans les 4h

🍼 **Sevrage:**
- Âge: 21-28 jours
- Poids minimum: 6-7 kg
- Truie retourne en chaleur 4-7 jours après sevrage',
 'Gestation = 114 jours. Détectez les chaleurs (vulve rouge, immobilité). Sevrage à 21-28 jours. La truie revient en chaleur 4-7 jours après sevrage.',
 10, 'global')
ON CONFLICT (id) DO UPDATE SET 
  content = EXCLUDED.content, 
  summary = EXCLUDED.summary,
  keywords = EXCLUDED.keywords,
  updated_at = NOW();

-- Finance
INSERT INTO knowledge_base (id, category, title, keywords, content, summary, priority, visibility) VALUES
('kb_finance', 'finance', 'Rentabilité de l''élevage porcin',
 ARRAY['rentabilité', 'combien', 'gagner', 'marge', 'investissement', 'seuil', 'rentabilité', 'coût', 'prix', 'bénéfice'],
 '**Analyse financière de l''élevage porcin:**

💰 **Investissement initial (20 porcs engraissement):**
- Bâtiment: 500 000 - 1 000 000 FCFA
- Équipements: 200 000 - 400 000 FCFA
- Achat porcelets (20): 600 000 - 1 000 000 FCFA
- **Total: 1,5 - 2,5 M FCFA**

📊 **Coûts de production par porc:**
- Alimentation (150-180kg d''aliment): 45 000 - 55 000 FCFA
- Soins vétérinaires: 3 000 - 5 000 FCFA
- Autres (eau, énergie): 2 000 - 3 000 FCFA
- **Total: 50 000 - 65 000 FCFA/porc**

💵 **Revenus et marge:**
- Prix de vente: 1 200 - 1 500 FCFA/kg
- Poids de vente: 100-110 kg
- Revenu/porc: 120 000 - 165 000 FCFA
- **Marge nette/porc: 30 000 - 50 000 FCFA**

📈 **Rentabilité annuelle (60 porcs/an):**
- Marge totale: 1,8 - 3 M FCFA/an
- ROI: 70-120% la première année

⚠️ **Seuil de rentabilité:**
- Prix de vente minimum: 1 000 FCFA/kg
- Taux de mortalité max: < 5%
- IC maximum: 3.5',
 'Investissement initial: 1.5-2.5M FCFA pour 20 porcs. Marge nette: 30-50K FCFA/porc. ROI de 70-120% la première année avec 60 porcs/an.',
 9, 'global')
ON CONFLICT (id) DO UPDATE SET 
  content = EXCLUDED.content, 
  summary = EXCLUDED.summary,
  keywords = EXCLUDED.keywords,
  updated_at = NOW();

-- Commerce
INSERT INTO knowledge_base (id, category, title, keywords, content, summary, priority, visibility) VALUES
('kb_commerce', 'commerce', 'Commercialisation des porcs',
 ARRAY['vendre', 'vente', 'commercialisation', 'client', 'marché', 'acheteur', 'prix', 'négocier', 'abattoir'],
 '**Comment bien vendre ses porcs:**

🎯 **Canaux de vente:**

**1. Vente directe aux particuliers**
- Meilleur prix: 1 300 - 1 500 FCFA/kg
- Période: Fêtes (Noël, Pâques, fin d''année)
- Astuce: Développez un réseau de clients fidèles

**2. Restaurants/Hôtels (CHR)**
- Prix: 1 200 - 1 400 FCFA/kg
- Avantage: Volume régulier
- Exigence: Qualité constante

**3. Charcutiers**
- Prix: 1 100 - 1 300 FCFA/kg
- Préfèrent: 120-150 kg
- Avantage: Gros volumes

**4. Marchés/Abattoirs**
- Prix: 1 000 - 1 200 FCFA/kg
- Avantage: Vente rapide
- Inconvénient: Prix plus bas

📊 **Poids optimal de vente:**
- Porcs charcutiers: 100-120 kg
- Cochons de lait: 10-15 kg (marchés de niche)
- Au-delà de 130 kg: Rendement diminue

💡 **Conseils pour mieux vendre:**
- Constituer une base clients avant d''avoir des porcs prêts
- Profiter des fêtes (prix +20-30%)
- Proposer la livraison
- Fidéliser avec qualité constante',
 'Vendez directement aux particuliers pour le meilleur prix (1300-1500 FCFA/kg), surtout pendant les fêtes. Le poids optimal est 100-120 kg.',
 8, 'global')
ON CONFLICT (id) DO UPDATE SET 
  content = EXCLUDED.content, 
  summary = EXCLUDED.summary,
  keywords = EXCLUDED.keywords,
  updated_at = NOW();

-- Infrastructure/Emplacement
INSERT INTO knowledge_base (id, category, title, keywords, content, summary, priority, visibility) VALUES
('kb_emplacement', 'emplacement', 'Infrastructure et emplacement',
 ARRAY['bâtiment', 'porcherie', 'loge', 'enclos', 'box', 'construction', 'ventilation', 'terrain', 'distance'],
 '**Aménager sa porcherie:**

📍 **Choix de l''emplacement:**
- Distance habitations: > 100m minimum
- Accès: Route praticable toute l''année
- Terrain: Plat, drainé, non inondable
- Orientation: Est-Ouest (ventilation naturelle)

📐 **Normes d''espace par animal:**

| Type | Surface/animal |
|------|----------------|
| Porcelet (10-30 kg) | 0.3-0.5 m² |
| Croissance (30-70 kg) | 0.5-0.7 m² |
| Finition (70-110 kg) | 0.8-1.0 m² |
| Truie gestante | 1.5-2.0 m² |
| Truie allaitante | 4-5 m² (avec loge) |
| Verrat | 6-8 m² |

🏗️ **Types de bâtiments:**

**1. Semi-ouvert (recommandé en Côte d''Ivoire)**
- Murs bas (1.2m) + grillage
- Toiture en tôle avec surélévation
- Coût: 20 000 - 30 000 FCFA/m²

**2. Fermé climatisé**
- Pour naisseurs intensifs
- Coût: 50 000 - 80 000 FCFA/m²

🌡️ **Confort thermique:**
- Température idéale: 18-22°C (adultes), 28-32°C (porcelets)
- Ventilation naturelle ou brasseurs d''air',
 'Distance minimum 100m des habitations. Prévoir 0.8-1 m²/porc en finition. Un bâtiment semi-ouvert coûte 20-30K FCFA/m² et convient au climat ivoirien.',
 8, 'global')
ON CONFLICT (id) DO UPDATE SET 
  content = EXCLUDED.content, 
  summary = EXCLUDED.summary,
  keywords = EXCLUDED.keywords,
  updated_at = NOW();

-- Eau
INSERT INTO knowledge_base (id, category, title, keywords, content, summary, priority, visibility) VALUES
('kb_eau', 'eau', 'Gestion de l''eau en élevage',
 ARRAY['eau', 'abreuvoir', 'forage', 'puits', 'consommation', 'boire', 'abreuvement'],
 '**Besoins en eau des porcs:**

💧 **Consommation journalière:**

| Type | Litres/jour |
|------|-------------|
| Porcelet sevré | 1-2 L |
| Croissance | 4-6 L |
| Finition | 6-10 L |
| Truie gestante | 12-15 L |
| Truie allaitante | 25-35 L |
| Verrat | 10-15 L |

📊 **Calcul pour 20 porcs en engraissement:**
- Besoin: 20 × 8 L = 160 L/jour
- Prévoir 200 L/jour (marge de sécurité)
- Par mois: ~6 000 L = 6 m³

🚰 **Types d''abreuvoirs:**

**1. Pipette (tétine)**
- Débit: 1.5-2 L/min
- Hauteur: 10 cm au-dessus de l''épaule
- Avantage: Eau propre, économie

**2. Auge**
- Capacité: 5-10 L
- Nettoyage: 2 fois/jour
- Inconvénient: Salissure fréquente

**3. Bol automatique**
- Niveau constant
- Coût plus élevé
- Idéal pour truies

💡 **Sources d''eau:**
- Forage: Investissement élevé mais fiable
- Puits: Moins cher mais risque de tarissement
- Eau de ville: Coût récurrent élevé',
 'Un porc en finition boit 6-10 L/jour, une truie allaitante 25-35 L/jour. Préférez les abreuvoirs à tétine pour l''hygiène. Un forage est l''idéal.',
 7, 'global')
ON CONFLICT (id) DO UPDATE SET 
  content = EXCLUDED.content, 
  summary = EXCLUDED.summary,
  keywords = EXCLUDED.keywords,
  updated_at = NOW();

-- Réglementation
INSERT INTO knowledge_base (id, category, title, keywords, content, summary, priority, visibility) VALUES
('kb_reglementation', 'reglementation', 'Réglementation de l''élevage porcin',
 ARRAY['réglementation', 'loi', 'norme', 'obligation', 'déclaration', 'légal', 'autorisation', 'permis'],
 '**Obligations légales en Côte d''Ivoire:**

📋 **Déclarations obligatoires:**

**1. Déclaration d''élevage**
- Auprès de la Direction des Services Vétérinaires
- Gratuite pour petits élevages (< 50 porcs)
- Permet: Accès aux services vétérinaires officiels

**2. Identification des animaux**
- Boucles auriculaires ou tatouage
- Obligatoire pour vente en abattoir
- Traçabilité sanitaire

📜 **Normes sanitaires:**
- Respect du calendrier vaccinal
- Déclaration des maladies à déclaration obligatoire (PPA, etc.)
- Élimination réglementée des cadavres
- Cahier d''élevage (registre sanitaire)

🏗️ **Normes d''urbanisme:**
- Distance minimale des habitations: Variable selon communes
- Permis de construire pour bâtiments > 20 m²
- Étude d''impact environnemental (grands élevages)

💼 **Aspects fiscaux:**
- Déclaration de revenus si activité principale
- TVA applicable sur ventes > seuil
- Possibilité de statut agricole

⚠️ **Sanctions possibles:**
- Amende pour non-déclaration d''élevage
- Saisie sanitaire si maladie non déclarée
- Fermeture pour non-conformité',
 'Déclarez votre élevage à la Direction des Services Vétérinaires (gratuit < 50 porcs). Tenez un cahier d''élevage et identifiez vos animaux.',
 6, 'global')
ON CONFLICT (id) DO UPDATE SET 
  content = EXCLUDED.content, 
  summary = EXCLUDED.summary,
  keywords = EXCLUDED.keywords,
  updated_at = NOW();

-- ============================================
-- Questions fréquentes associées
-- ============================================

INSERT INTO knowledge_questions (id, knowledge_id, question, short_answer) VALUES
('kq_naisseur_1', 'kb_types_elevage', 'C''est quoi un naisseur?', 'Un éleveur qui produit des porcelets pour les vendre aux engraisseurs'),
('kq_naisseur_2', 'kb_types_elevage', 'C''est quoi un engraisseur?', 'Un éleveur qui achète des porcelets et les élève jusqu''au poids de vente'),
('kq_gestation', 'kb_reproduction', 'Combien de temps dure la gestation du porc?', '114 jours (3 mois, 3 semaines, 3 jours)'),
('kq_sevrage', 'kb_reproduction', 'À quel âge sevrer les porcelets?', 'Entre 21 et 28 jours, poids minimum 6-7 kg'),
('kq_prix', 'kb_commerce', 'Quel est le prix du porc au kg?', 'Entre 1 000 et 1 500 FCFA/kg selon le canal de vente'),
('kq_alimentation', 'kb_alimentation', 'Combien mange un porc par jour?', 'De 0.5 kg (porcelet) à 3.5 kg (finition) selon le stade'),
('kq_espace', 'kb_emplacement', 'Quelle surface pour un porc?', '0.8 à 1 m² par porc en finition'),
('kq_eau', 'kb_eau', 'Combien d''eau boit un porc?', '6-10 litres/jour pour un porc en engraissement'),
('kq_investissement', 'kb_finance', 'Combien investir pour démarrer?', '1.5 à 2.5 millions FCFA pour 20 porcs en engraissement'),
('kq_marge', 'kb_finance', 'Quelle est la marge par porc?', '30 000 à 50 000 FCFA de marge nette par porc')
ON CONFLICT (id) DO UPDATE SET 
  short_answer = EXCLUDED.short_answer;

-- ============================================
-- COMMENTAIRES
-- ============================================
COMMENT ON TABLE knowledge_base IS 'Base de connaissances initiale peuplée par migration 058';

