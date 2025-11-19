/**
 * 🎓 ÉCRAN DE FORMATION - Élevage Porcin
 * Guide complet avec 10 chapitres en accordéon
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

// Activer LayoutAnimation pour Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ChapterContent {
  id: number;
  title: string;
  icon: string;
  content: string;
}

const CHAPTERS: ChapterContent[] = [
  {
    id: 1,
    title: 'Types d\'élevage porcin',
    icon: 'list-outline',
    content: `**Les 4 types principaux d'élevage porcin**

🐷 **1. Production de porcelets (Naisseur)**
Cycle : Saillie → Gestation (114j) → Mise bas → Sevrage (21-28j)
Avantages : Marge bénéficiaire élevée, moins d'espace requis
Inconvénients : Expertise technique nécessaire, mortalité périnatale
Investissement initial : Élevé (truies reproductrices, verrats, équipements de maternité)
Rentabilité : Bonne si taux de survie > 90%

🐖 **2. Engraissement uniquement (Engraisseur)**
Cycle : Achat porcelets sevrés → Croissance (180j) → Vente
Avantages : Cycle court, gestion simplifiée, investissement moyen
Inconvénients : Dépendance aux naisseurs, coût d'achat des porcelets
Investissement initial : Moyen (bâtiments d'engraissement, aliments)
Rentabilité : Stable avec bon GMQ (>700g/jour)

🥓 **3. Production charcuterie**
Cycle : Complet jusqu'à poids élevé (120-150 kg)
Avantages : Valeur ajoutée, marché de niche
Inconvénients : Cycle long, alimentation coûteuse
Investissement initial : Moyen à élevé
Rentabilité : Excellente avec transformation

♻️ **4. Cycle complet (Naisseur-Engraisseur)**
Cycle : De la saillie à la vente des porcs finis
Avantages : Autonomie totale, meilleure marge globale
Inconvénients : Complexité élevée, investissement très important
Investissement initial : Très élevé (tous équipements)
Rentabilité : Optimale à long terme avec maîtrise technique`,
  },
  {
    id: 2,
    title: 'Définir son objectif',
    icon: 'trophy-outline',
    content: `**Comment définir un objectif clair**

🎯 **Questions essentielles**

1. **Quel est mon capital disponible ?**
   - < 2M FCFA → Engraissement de 10-20 porcs
   - 2-5M FCFA → Naisseur avec 5-10 truies
   - > 5M FCFA → Cycle complet

2. **Quelle surface ai-je ?**
   - Minimum 100m² pour 20 porcs d'engraissement
   - 200-300m² pour naisseur (5-10 truies)
   - > 500m² pour cycle complet

3. **Quel temps puis-je y consacrer ?**
   - Temps partiel (2h/jour) → Engraissement
   - Mi-temps (4h/jour) → Naisseur
   - Temps plein → Cycle complet

4. **Quel est mon marché cible ?**
   - Particuliers → Porcs de 90-100 kg
   - Restaurants/Hôtels → Porcs de 100-120 kg
   - Charcutiers → Porcs de 120-150 kg
   - Naisseurs → Porcelets sevrés

📊 **Alignement objectif/type d'élevage**

→ Objectif : Revenu rapide (6 mois)
   Type : Engraissement uniquement
   
→ Objectif : Revenu maximum à long terme
   Type : Cycle complet
   
→ Objectif : Spécialisation technique
   Type : Naisseur
   
→ Objectif : Niche premium
   Type : Production charcuterie

💡 **Exemple d'objectif bien défini**
"Produire 60 porcs d'engraissement par an (3 bandes de 20) pour vendre aux particuliers à 110 kg, avec un objectif de marge nette de 1,5M FCFA/an"`,
  },
  {
    id: 3,
    title: 'Pilier 1 : Choix de la race',
    icon: 'ribbon-outline',
    content: `**Choisir la bonne race selon vos objectifs**

🐷 **Races pour la production de porcelets**

**Large White**
- Prolificité : 11-13 porcelets/portée
- Qualités maternelles : Excellentes
- Aptitude laitière : Très bonne
- Avantages : Rustique, adaptable
- Prix moyen : 150 000 - 200 000 FCFA/truie

**Landrace**
- Prolificité : 10-12 porcelets/portée
- Longueur de carcasse : Excellente
- Qualités maternelles : Bonnes
- Avantages : Longue durée de lactation
- Prix moyen : 140 000 - 180 000 FCFA/truie

🐖 **Races pour l'engraissement**

**Duroc**
- GMQ : 750-850 g/jour
- Indice de consommation : 2,8-3,2
- Qualité viande : Excellente (persillage)
- Avantages : Viande tendre et savoureuse
- Prix moyen : 30 000 - 40 000 FCFA/porcelet

**Piétrain**
- GMQ : 700-800 g/jour
- Rendement carcasse : 80-82%
- Masse musculaire : Exceptionnelle
- Avantages : Idéal pour charcuterie
- Prix moyen : 35 000 - 45 000 FCFA/porcelet

🔄 **Races polyvalentes (cycle complet)**

**Large White x Landrace (F1)**
- Vigueur hybride
- Prolificité : 12-14 porcelets
- GMQ des porcelets : 750-800 g/jour
- Avantages : Meilleur des deux races
- Prix moyen : 160 000 - 220 000 FCFA/truie

**Croisement triple (LW x L) x Duroc**
- Production : Excellente
- Croissance : Rapide
- Qualité viande : Optimale
- Avantages : Performances maximales
- Prix moyen : 40 000 - 50 000 FCFA/porcelet

💡 **Recommandations par type d'élevage**
→ Naisseur : Large White ou Landrace
→ Engraisseur : Duroc ou croisés Duroc
→ Charcuterie : Piétrain ou Duroc
→ Cycle complet : Croisements F1 ou triple`,
  },
  {
    id: 4,
    title: 'Pilier 2 : Emplacement de la ferme',
    icon: 'location-outline',
    content: `**Critères de choix de l'emplacement**

📍 **Critères géographiques**

**Distance des habitations**
- Minimum 50m des maisons voisines
- Minimum 100m des écoles, hôpitaux
- Respect des normes d'hygiène et nuisances
- Privilégier zones rurales/périurbaines

**Accessibilité**
- Route praticable toute l'année
- Accès camions pour livraison aliments
- Proximité marché (< 30 km idéal)
- Transport porcs finis facilité

**Topographie**
- Terrain légèrement en pente (drainage naturel)
- Éviter bas-fonds (humidité, inondations)
- Éviter pentes raides (érosion, travaux)
- Sol stable pour construction

🌡️ **Critères climatiques**

**Température**
- Zone tempérée idéale : 18-24°C
- Éviter zones très chaudes (> 35°C régulier)
- Prévoir ventilation/ombrage si climat chaud
- Isolation si températures < 10°C

**Pluviométrie**
- Éviter zones à très fortes pluies
- Prévoir drainage efficace
- Toits étanches obligatoires
- Système évacuation eaux

**Exposition**
- Orientation Est-Ouest (ombre après-midi)
- Protection vents dominants
- Éviter exposition plein sud (surchauffe)
- Arbres pour ombrage (distance 5-10m)

🚰 **Proximité services**

**Eau**
- Source permanente à < 100m
- Forage ou raccordement réseau
- Débit minimum : 50L/porc/jour
- Qualité potable vérifiée

**Électricité**
- Raccordement réseau ou groupe électrogène
- Pour éclairage, ventilation, pompes
- Puissance adaptée nombre de porcs

**Services vétérinaires**
- Vétérinaire à < 20 km
- Pharmacie vétérinaire accessible
- Service d'urgence disponible

💰 **Coût du terrain**
Zone rurale : 500-2000 FCFA/m²
Zone périurbaine : 2000-5000 FCFA/m²
Surface recommandée : 500-1000 m² minimum`,
  },
  {
    id: 5,
    title: 'Pilier 3 : Accès à l\'eau',
    icon: 'water-outline',
    content: `**L'eau : élément vital de l'élevage**

💧 **Besoins en eau**

**Consommation par catégorie**
- Porcelet (7-30 kg) : 2-5 L/jour
- Porc croissance (30-60 kg) : 5-10 L/jour
- Porc finition (60-110 kg) : 10-15 L/jour
- Truie gestante : 15-20 L/jour
- Truie allaitante : 20-30 L/jour
- Verrat : 15-20 L/jour

**Calcul des besoins totaux**
Exemple élevage 50 porcs engraissement :
50 porcs × 12 L/jour = 600 L/jour
+ 20% nettoyage = 720 L/jour
Soit 22 000 L/mois minimum

🔍 **Qualité de l'eau**

**Critères physiques**
- Inodore, incolore, claire
- Température : 15-25°C
- pH : 6,5-8,5
- Absence de sédiments

**Critères chimiques**
- Nitrates < 50 mg/L
- Fer < 0,3 mg/L
- Chlorures < 250 mg/L
- Sulfates < 250 mg/L
- Minéraux dissous < 500 mg/L

**Critères bactériologiques**
- Coliformes fécaux : 0/100 mL
- E. coli : 0/100 mL
- Streptocoques : 0/100 mL
- Analyse tous les 6 mois minimum

📊 **Sources d'approvisionnement**

**1. Forage**
Avantages : Autonomie, qualité constante
Coût : 800 000 - 1 500 000 FCFA
Profondeur : 30-80m selon région
Débit nécessaire : 1-2 m³/heure

**2. Puits**
Avantages : Coût modéré
Coût : 200 000 - 500 000 FCFA
Profondeur : 10-30m
Risque : Contamination, tarissement

**3. Réseau public**
Avantages : Qualité garantie
Coût : Abonnement + consommation
Contrainte : Disponibilité, pression

**4. Source/Rivière**
Avantages : Gratuit
Contraintes : Traitement obligatoire
Risques : Pollution, tarissement saison sèche

🔧 **Infrastructure nécessaire**

**Château d'eau**
- Capacité : 2-5 m³
- Hauteur : 3-5m
- Coût : 150 000 - 400 000 FCFA
- Distribution gravitaire

**Réseau de distribution**
- Tuyaux PVC Ø 25-40mm
- Abreuvoirs automatiques
- 1 abreuvoir/10-15 porcs
- Coût : 50 000 - 150 000 FCFA

**Traitement**
- Filtration mécanique
- Chloration si nécessaire
- Contrôle qualité régulier`,
  },
  {
    id: 6,
    title: 'Pilier 4 : Alimentation',
    icon: 'nutrition-outline',
    content: `**Stratégie d'alimentation optimale**

🌾 **Types d'aliments**

**1. Aliments industriels (concentrés)**
Avantages : Équilibrés, pratiques, performances optimales
Inconvénients : Coûteux (70% charges)
Coût : 200-250 FCFA/kg

**Aliment porcelet (0-30 kg)**
- Protéines : 18-20%
- Énergie : 3200-3400 kcal/kg
- Consommation : 40-50 kg/porc

**Aliment croissance (30-60 kg)**
- Protéines : 16-18%
- Énergie : 3100-3300 kcal/kg
- Consommation : 80-100 kg/porc

**Aliment finition (60-110 kg)**
- Protéines : 14-16%
- Énergie : 3000-3200 kcal/kg
- Consommation : 120-150 kg/porc

**2. Aliments fermiers (fabriqués)**
Ingrédients de base :
- Maïs (60%) : 120 FCFA/kg
- Tourteau soja (20%) : 250 FCFA/kg
- Son de blé (10%) : 80 FCFA/kg
- CMV* (5%) : 400 FCFA/kg
- Sel, lysine (5%) : 100 FCFA/kg
Coût moyen : 150-180 FCFA/kg

**3. Aliments alternatifs**
- Drêche de brasserie : 20-40 FCFA/kg
- Issues de rizerie : 60-80 FCFA/kg
- Manioc : 50-70 FCFA/kg
- Patate douce : 80-100 FCFA/kg
- Déchets fruits/légumes : Gratuit-30 FCFA/kg

📊 **Coûts alimentaires**

**Engraissement classique (porcelet 30kg → 110kg)**
Gain de poids : 80 kg
Indice de consommation : 3,0
Aliment nécessaire : 240 kg

Avec aliment industriel :
240 kg × 225 FCFA = 54 000 FCFA

Avec aliment fermier :
240 kg × 165 FCFA = 39 600 FCFA
Économie : 14 400 FCFA/porc (26%)

**Cycle complet (truie + 20 porcelets/an)**
Truie : 1000 kg/an × 200 FCFA = 200 000 FCFA
20 porcelets : 20 × 240 kg × 165 FCFA = 792 000 FCFA
Total : 992 000 FCFA/truie/an

💡 **Stratégies d'optimisation**

**1. Alimentation bi-phase**
- Croissance : Aliment riche (protéines)
- Finition : Aliment économique
- Économie : 10-15%

**2. Alimentation rationnée**
- Éviter gaspillage
- Contrôle quotidien
- Économie : 5-10%

**3. Incorporation sous-produits**
- Maximum 30% de la ration
- Complément avec concentré
- Économie : 20-30%

**4. Fabrication à la ferme**
- Investir dans mélangeur
- Acheter ingrédients en gros
- Économie : 25-35%

📈 **Plan alimentaire type**

**Engraissement 180 jours**
Jour 0-30 : Aliment porcelet (1,5 kg/jour)
Jour 30-90 : Aliment croissance (2,0 kg/jour)
Jour 90-180 : Aliment finition (2,8 kg/jour)
Total : 45 + 120 + 252 = 417 kg
Coût moyen : 70 000 FCFA/porc`,
  },
  {
    id: 7,
    title: 'Pilier 5 : Prophylaxie',
    icon: 'medical-outline',
    content: `**Programme sanitaire complet**

💉 **Calendrier de vaccination**

**Truies reproductrices**
- Rouget : Tous les 6 mois
- Parvovirose : Tous les 6 mois
- Mal rouge : Annuel
- Coût : 2 000 - 3 000 FCFA/dose

**Porcelets**
Semaine 3 : Fer injectable (anémie)
Semaine 8 : Rouget + Parvovirose
Semaine 12 : Rappel
Coût total : 1 500 - 2 500 FCFA/porcelet

**Verrats**
Même protocole que truies
Fréquence : Tous les 6 mois
Coût annuel : 6 000 - 8 000 FCFA/verrat

🐛 **Déparasitage**

**Interne (vers)**
Fréquence : Tous les 3 mois
Produits : Ivermectine, Lévamisole
Coût : 500 - 1 000 FCFA/porc

**Externe (gale, poux)**
Fréquence : Selon besoin
Produits : Amitraz, Pyréthrines
Coût : 300 - 800 FCFA/porc

🧹 **Hygiène et biosécurité**

**Nettoyage des locaux**
Fréquence : Après chaque bande
Protocole :
1. Vidage complet
2. Raclage matières organiques
3. Lavage haute pression
4. Désinfection (Eau de Javel, formol)
5. Séchage 7-10 jours (vide sanitaire)

Coût : 5 000 - 10 000 FCFA/opération

**Contrôle des accès**
- Pédiluve à l'entrée
- Tenue spécifique élevage
- Quarantaine nouveaux animaux (15j)
- Registre visiteurs

**Gestion des cadavres**
- Fosse sceptique ou incinération
- Déclaration obligatoire si maladie
- Désinfection zone

🏥 **Soins courants**

**Matériel de base**
- Thermomètre : 2 000 FCFA
- Seringues (50) : 5 000 FCFA
- Aiguilles (100) : 3 000 FCFA
- Désinfectant : 2 000 FCFA
- Pince castration : 8 000 FCFA
Total : 20 000 FCFA

**Pharmacie de base**
- Antibiotiques : 15 000 FCFA
- Anti-inflammatoires : 8 000 FCFA
- Antiseptiques : 5 000 FCFA
- Anti-diarrhéiques : 7 000 FCFA
Total : 35 000 FCFA

🩺 **Suivi vétérinaire**

**Visites préventives**
Fréquence : Mensuelle
Coût : 10 000 - 20 000 FCFA/visite
Budget annuel : 120 000 - 240 000 FCFA

**Interventions courantes**
- Castration : 500 - 1 000 FCFA/porc
- Traitement maladie : 2 000 - 5 000 FCFA
- Autopsie : 5 000 - 10 000 FCFA

📊 **Budget sanitaire annuel**

**50 porcs engraissement/an**
Vaccinations : 125 000 FCFA
Déparasitage : 25 000 FCFA
Désinfection : 30 000 FCFA
Vétérinaire : 150 000 FCFA
Pharmacie : 50 000 FCFA
Total : 380 000 FCFA (15% coût total)

💡 **Principales maladies à connaître**

**Diarrhée néonatale** (porcelets)
Prévention : Hygiène, vaccin truie
Traitement : Antibiotiques

**Peste porcine africaine** (mortelle)
Prévention : Biosécurité stricte
Pas de traitement

**Rouget**
Prévention : Vaccination
Traitement : Antibiotiques (pénicilline)`,
  },
  {
    id: 8,
    title: 'Gestion financière',
    icon: 'calculator-outline',
    content: `**Comptabilité et rentabilité**

💰 **Structure des coûts**

**Engraissement (1 porc 30→110kg)**

**Coûts variables (70-75%)**
- Achat porcelet 30kg : 30 000 FCFA
- Aliment (240kg × 200) : 48 000 FCFA
- Santé (vaccins, soins) : 3 000 FCFA
- Eau, électricité : 2 000 FCFA
Total CV : 83 000 FCFA

**Coûts fixes (25-30%)**
- Amortissement bâtiment : 5 000 FCFA
- Main d'œuvre : 8 000 FCFA
- Entretien : 2 000 FCFA
- Divers : 2 000 FCFA
Total CF : 17 000 FCFA

**Coût total : 100 000 FCFA**

**Revenu**
Vente 110 kg × 1 300 FCFA/kg = 143 000 FCFA

**Marge brute : 43 000 FCFA/porc (43%)**

📊 **Investissements initiaux**

**Engraissement 20 porcs**
- Bâtiment (60m²) : 1 200 000 FCFA
- Mangeoires, abreuvoirs : 150 000 FCFA
- Clôtures : 100 000 FCFA
- Matériel : 50 000 FCFA
Total : 1 500 000 FCFA

**Naisseur 5 truies**
- Bâtiments (120m²) : 2 400 000 FCFA
- Truies (5 × 180 000) : 900 000 FCFA
- Verrat : 200 000 FCFA
- Équipement maternité : 400 000 FCFA
- Matériel : 100 000 FCFA
Total : 4 000 000 FCFA

**Cycle complet 10 truies**
- Bâtiments (300m²) : 6 000 000 FCFA
- Truies (10 × 180 000) : 1 800 000 FCFA
- Verrats (2) : 400 000 FCFA
- Équipements complets : 800 000 FCFA
- Matériel : 200 000 FCFA
Total : 9 200 000 FCFA

💵 **Fonds de roulement**

**Engraissement 20 porcs (6 mois)**
- Achat porcelets : 600 000 FCFA
- Aliment 3 mois : 720 000 FCFA
- Santé : 60 000 FCFA
- Charges fixes : 240 000 FCFA
Total : 1 620 000 FCFA

**Naisseur 5 truies (6 mois)**
- Aliment truies : 600 000 FCFA
- Aliment porcelets : 200 000 FCFA
- Santé : 150 000 FCFA
- Charges fixes : 300 000 FCFA
Total : 1 250 000 FCFA

📈 **Rentabilité**

**Seuil de rentabilité**

Engraissement :
Point mort : 8-10 porcs/an
Avec 40 porcs/an (2 bandes) :
Marge nette : 1 720 000 FCFA/an
ROI : 1,2 ans

Naisseur :
Point mort : 3 truies productives
Avec 5 truies (100 porcelets/an) :
Marge nette : 2 400 000 FCFA/an
ROI : 1,7 ans

**Indicateurs clés**
- Marge brute > 40%
- Taux de mortalité < 5%
- Indice de consommation < 3,2
- GMQ > 700 g/jour

📒 **Outils de suivi**

**Registres obligatoires**
- Entrées/sorties animaux
- Consommation aliments
- Interventions sanitaires
- Mortalités
- Ventes

**Indicateurs à suivre**
- Coût aliment/kg gain
- Marge par porc
- Trésorerie mensuelle
- Charges fixes/variables

💡 **Conseils gestion**
✅ Tenir comptabilité rigoureuse
✅ Séparer comptes élevage/personnel
✅ Constituer fonds urgence (10%)
✅ Réinvestir 20% bénéfices
✅ Diversifier revenus si possible`,
  },
  {
    id: 9,
    title: 'Commercialisation',
    icon: 'storefront-outline',
    content: `**Stratégies de vente et débouchés**

🎯 **Canaux de commercialisation**

**1. Vente directe aux particuliers**
Avantages :
- Meilleur prix (1 300-1 500 FCFA/kg vif)
- Paiement immédiat
- Fidélisation clientèle
- Pas d'intermédiaires

Inconvénients :
- Recherche clients
- Ventes par unité
- Transport

Stratégies :
- Bouche-à-oreille
- Réseaux sociaux
- Affichage local
- Qualité constante

**2. Restaurants et hôtels**
Avantages :
- Volumes réguliers
- Contrats possibles
- Prix correct (1 200-1 400 FCFA/kg)

Inconvénients :
- Exigences qualité
- Délais paiement (30-60j)
- Normes sanitaires strictes

Conditions :
- Certificat vétérinaire
- Régularité livraisons
- Poids standardisés
- Traçabilité

**3. Boucheries et charcuteries**
Avantages :
- Gros volumes
- Débouché stable
- Professionnels

Inconvénients :
- Prix inférieur (1 100-1 300 FCFA/kg)
- Exigences qualité/poids

**4. Marchés de bétail**
Avantages :
- Vente rapide
- Plusieurs acheteurs

Inconvénients :
- Prix variable (1 000-1 200 FCFA/kg)
- Commission (5-10%)
- Stress animaux

**5. Intermédiaires (collecteurs)**
Avantages :
- Vente à la ferme
- Pas de transport
- Paiement cash

Inconvénients :
- Prix le plus bas (900-1 100 FCFA/kg)
- Négociation difficile

📊 **Stratégie de prix**

**Facteurs déterminants**
- Poids vif du porc
- État d'engraissement
- Période (fêtes → prix ↑)
- Offre/demande locale
- Canal de vente

**Périodes fastes (prix +20-30%)**
- Décembre-Janvier : Fêtes
- Avril : Pâques
- Septembre : Rentrée
- Mariages, cérémonies

**Périodes creuses (prix -10-15%)**
- Février-Mars
- Juillet-Août (saison pluies)

💼 **Poids optimaux de vente**

**Selon le marché**
- Particuliers : 90-110 kg
- Restaurants : 100-120 kg
- Charcuterie : 120-150 kg
- Porcelets sevrés : 7-10 kg (naisseur)

**Compromis économique**
Poids optimal : 100-110 kg
- IC encore acceptable
- Prix au kg maximal
- Demande forte
- Rotation optimale

📱 **Marketing et communication**

**Image de marque**
- Nom de ferme accrocheur
- Logo simple
- Slogan ("Qualité garantie")

**Présence digitale**
- Page Facebook
- WhatsApp Business
- Photos produits
- Témoignages clients

**Promotion**
- Réductions fidélité (-5%)
- Parrainage (réduction)
- Offres fêtes
- Livraison gratuite (>2 porcs)

**Différenciation**
- Alimentation naturelle
- Sans antibiotiques de croissance
- Traçabilité complète
- Certification bio (si possible)

📝 **Documents commerciaux**

**Obligatoires**
- Certificat sanitaire vétérinaire
- Bon de livraison
- Facture (si professionnel)

**Recommandés**
- Carte de visite
- Brochure ferme
- Fiche technique produit

🤝 **Fidélisation client**

**Service client**
- Conseil préparation
- Découpe sur demande
- Réponse rapide
- Flexibilité livraison

**Qualité constante**
- Poids homogènes
- Bon état sanitaire
- Respect délais
- Propreté animaux

💰 **Calcul marge commerciale**

Exemple engraissement :
Coût revient : 100 000 FCFA
Vente 110kg × 1 300 FCFA : 143 000 FCFA
Marge brute : 43 000 FCFA (43%)

Si frais commercialisation : 3 000 FCFA
Marge nette : 40 000 FCFA (40%)

Objectif : Marge > 35%`,
  },
  {
    id: 10,
    title: 'Réglementation',
    icon: 'document-text-outline',
    content: `**Cadre légal et bonnes pratiques**

📜 **Obligations administratives**

**Déclaration de l'élevage**
Où : Direction des Services Vétérinaires
Quand : Avant démarrage activité
Documents :
- Formulaire déclaration
- Plan de situation
- Plan bâtiments
Coût : Gratuit à 10 000 FCFA

**Numéro d'identification**
Attribué par services vétérinaires
Obligatoire pour vente
À afficher dans élevage

**Registre d'élevage**
Tenue obligatoire
Contenu :
- Entrées/sorties animaux
- Traitements médicaux
- Mortalités
- Aliments utilisés
Conservation : 5 ans minimum

🏛️ **Normes sanitaires**

**Contrôles vétérinaires**
Fréquence : Annuel minimum
Certificats requis :
- Certificat sanitaire
- Certificat de vaccination
- Attestation déparasitage

**Abattage**
Obligatoire en abattoir agréé
Inspection ante-mortem
Inspection post-mortem
Estampillage viande

**Traçabilité**
Identification animaux
Boucles auriculaires
Registre mouvements
Bon de transport

🌍 **Normes environnementales**

**Gestion des effluents**
Fosse à lisier (étanche)
Distance habitations : 50m
Épandage réglementé
Compostage (si solide)

**Gestion de l'eau**
Éviter pollution nappes
Système drainage
Séparation eaux propres/sales

**Nuisances**
Odeurs : Haies végétales
Bruit : Isolation bâtiments
Mouches : Pièges, hygiène

⚖️ **Respect du bien-être animal**

**Espace minimum**
Porc 50-110 kg : 0,65-1 m²/porc
Truie gestante : 2 m²
Truie allaitante : 5 m² + cases
Verrat : 6 m²

**Conditions d'hébergement**
Sol non glissant
Litière si sol béton
Ventilation suffisante
Éclairage naturel/artificiel

**Interdictions**
- Maltraitance
- Privation eau/nourriture
- Mutilations non justifiées
- Attache permanente

🏥 **Obligations sanitaires**

**Vaccination obligatoire**
Selon région/contexte :
- Peste porcine classique
- Rouget (recommandé)

**Déclaration maladies**
Maladies à déclaration obligatoire :
- Peste porcine africaine
- Fièvre aphteuse
- Brucellose

Sanction non-déclaration :
Amendes + fermeture élevage

**Quarantaine**
Nouveaux animaux : 15 jours
Animaux malades : Isolement
Visite extérieure : Désinfection

💼 **Fiscalité**

**Régime fiscal**
Activité agricole : Exonération partielle
Chiffre affaires < 15M : Régime simplifié
CA > 15M : Régime réel

**Taxes possibles**
- Patente (si commerce)
- TVA (si régime réel)
- Impôt sur bénéfices

**Déductibilité**
Charges déductibles :
- Aliments
- Soins vétérinaires
- Amortissements
- Salaires

**Aides et subventions**
Se renseigner :
- Ministère Agriculture
- Chambres d'Agriculture
- Projets développement rural
- Banques (crédits agricoles)

📋 **Bonnes pratiques**

✅ **Hygiène**
- Nettoyage régulier
- Désinfection
- Vêtements propres
- Pédiluve entrée

✅ **Traçabilité**
- Registres à jour
- Factures conservées
- Photos états élevage
- Suivi sanitaire complet

✅ **Voisinage**
- Informer implantation
- Gérer nuisances
- Communication ouverte
- Respect distances

✅ **Professionnalisme**
- Formation continue
- Veille technique
- Réseau éleveurs
- Conseil vétérinaire

⚠️ **Sanctions possibles**

Non-respect normes :
- Avertissement
- Amendes (50 000-500 000 FCFA)
- Fermeture temporaire
- Fermeture définitive

Cas graves :
- Épidémie non déclarée
- Maltraitance animale
- Pollution environnement
- Vente viande non inspectée

💡 **Conseils conformité**
→ Se faire accompagner au démarrage
→ Respecter toutes obligations dès début
→ Tenir registres à jour
→ Assurer élevage (si possible)
→ Adhérer association éleveurs`,
  },
];

export default function TrainingScreen() {
  const { colors } = useTheme();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleChapter = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const renderChapter = (chapter: ChapterContent) => {
    const isExpanded = expandedId === chapter.id;

    return (
      <View
        key={chapter.id}
        style={[
          styles.chapterCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            ...colors.shadow.medium,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.chapterHeader}
          onPress={() => toggleChapter(chapter.id)}
          activeOpacity={0.7}
        >
          <View style={styles.chapterHeaderLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name={chapter.icon as any} size={24} color={colors.primary} />
            </View>
            <View style={styles.chapterTitleContainer}>
              <Text style={[styles.chapterNumber, { color: colors.primary }]}>
                Chapitre {chapter.id}
              </Text>
              <Text style={[styles.chapterTitle, { color: colors.text }]}>{chapter.title}</Text>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.chapterContent, { borderTopColor: colors.border }]}>
            <Text style={[styles.contentText, { color: colors.text }]}>{chapter.content}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, ...colors.shadow.small }]}>
        <View style={styles.headerContent}>
          <Ionicons name="school" size={28} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Formation - Élevage Porcin
          </Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Guide complet en 10 chapitres
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {CHAPTERS.map((chapter) => renderChapter(chapter))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            💡 Cette formation est un guide de base. Consultez toujours des professionnels pour des
            conseils spécifiques à votre situation.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginLeft: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  chapterCard: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  chapterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterTitleContainer: {
    flex: 1,
  },
  chapterNumber: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chapterContent: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    marginTop: 8,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  footerText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

