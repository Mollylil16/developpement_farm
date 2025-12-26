/**
 * Base de connaissances pour l'agent Kouakou
 * Contient les informations de formation sur l'élevage porcin
 * Source: Menu Formation de l'application
 */

export interface KnowledgeTopic {
  id: string;
  title: string;
  keywords: string[];
  content: string;
  category: 'types_elevage' | 'objectifs' | 'races' | 'emplacement' | 'eau' | 'alimentation' | 'sante' | 'finance' | 'commerce' | 'reglementation';
}

/**
 * Base de connaissances structurée par thèmes
 */
export const TRAINING_KNOWLEDGE_BASE: KnowledgeTopic[] = [
  {
    id: 'types_elevage',
    title: "Types d'élevage porcin",
    keywords: ['type', 'élevage', 'naisseur', 'engraisseur', 'cycle complet', 'charcuterie', 'production', 'porcelets'],
    category: 'types_elevage',
    content: `**Les 4 types principaux d'élevage porcin:**

🐷 **1. Naisseur (Production de porcelets)**
- Cycle: Saillie → Gestation (114j) → Mise bas → Sevrage (21-28j)
- Avantages: Marge élevée, moins d'espace
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
- Inconvénients: Complexité, investissement élevé`
  },
  {
    id: 'objectifs',
    title: 'Définir son objectif',
    keywords: ['objectif', 'capital', 'investissement', 'budget', 'surface', 'marché', 'temps', 'démarrer'],
    category: 'objectifs',
    content: `**Comment définir un objectif clair:**

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
"Produire 60 porcs/an (3 bandes de 20) pour vendre à 110 kg, marge nette 1,5M FCFA/an"`
  },
  {
    id: 'races',
    title: 'Choix de la race',
    keywords: ['race', 'large white', 'landrace', 'duroc', 'piétrain', 'croisement', 'génétique', 'truie', 'verrat'],
    category: 'races',
    content: `**Choisir la bonne race selon vos objectifs:**

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
- IC: 2,8-3,2
- Viande excellente (persillage)
- Prix: 30 000-40 000 FCFA/porcelet

**Piétrain**
- GMQ: 700-800 g/jour
- Rendement carcasse: 80-82%
- Idéal charcuterie
- Prix: 35 000-45 000 FCFA/porcelet

🔄 **Croisements recommandés:**
- Large White x Landrace (F1): 12-14 porcelets, 160 000-220 000 FCFA
- Triple croisement (LW x L) x Duroc: Performances maximales

💡 **Recommandations:**
→ Naisseur: Large White ou Landrace
→ Engraisseur: Duroc ou croisés
→ Charcuterie: Piétrain ou Duroc
→ Cycle complet: Croisements F1 ou triple`
  },
  {
    id: 'emplacement',
    title: 'Emplacement de la ferme',
    keywords: ['emplacement', 'terrain', 'localisation', 'distance', 'construction', 'climat', 'température', 'bâtiment'],
    category: 'emplacement',
    content: `**Critères de choix de l'emplacement:**

📍 **Critères géographiques:**
- Distance habitations: Minimum 50m des maisons, 100m des écoles/hôpitaux
- Route praticable toute l'année
- Proximité marché: < 30 km idéal
- Terrain légèrement en pente (drainage)

🌡️ **Critères climatiques:**
- Température idéale: 18-24°C
- Éviter zones très chaudes (> 35°C)
- Prévoir ventilation/ombrage
- Orientation Est-Ouest recommandée

🚰 **Proximité services:**
- Eau: Source < 100m, débit 50L/porc/jour
- Électricité: Raccordement ou groupe électrogène
- Vétérinaire: < 20 km

💰 **Coût du terrain:**
- Zone rurale: 500-2000 FCFA/m²
- Zone périurbaine: 2000-5000 FCFA/m²
- Surface recommandée: 500-1000 m² minimum`
  },
  {
    id: 'eau',
    title: "Accès à l'eau",
    keywords: ['eau', 'abreuvoir', 'consommation', 'forage', 'puits', 'qualité eau', 'château eau'],
    category: 'eau',
    content: `**L'eau: élément vital de l'élevage:**

💧 **Besoins en eau par catégorie:**
- Porcelet (7-30 kg): 2-5 L/jour
- Croissance (30-60 kg): 5-10 L/jour
- Finition (60-110 kg): 10-15 L/jour
- Truie gestante: 15-20 L/jour
- Truie allaitante: 20-30 L/jour
- Verrat: 15-20 L/jour

📊 **Exemple calcul (50 porcs):**
50 × 12 L/jour = 600 L/jour
+ 20% nettoyage = 720 L/jour
Soit 22 000 L/mois minimum

🔍 **Qualité requise:**
- pH: 6,5-8,5
- Nitrates < 50 mg/L
- Coliformes fécaux: 0/100 mL
- Analyse tous les 6 mois

📊 **Sources d'approvisionnement:**
1. Forage: 800 000-1 500 000 FCFA
2. Puits: 200 000-500 000 FCFA
3. Réseau public: Abonnement + consommation
4. Source/Rivière: Traitement obligatoire

🔧 **Infrastructure:**
- Château d'eau: 150 000-400 000 FCFA (2-5 m³)
- 1 abreuvoir/10-15 porcs`
  },
  {
    id: 'alimentation',
    title: 'Alimentation',
    keywords: ['aliment', 'alimentation', 'nourriture', 'provende', 'maïs', 'soja', 'ration', 'coût aliment', 'indice consommation', 'GMQ'],
    category: 'alimentation',
    content: `**Stratégie d'alimentation optimale:**

🌾 **Types d'aliments:**

**1. Aliments industriels (concentrés)**
- Coût: 200-250 FCFA/kg
- Porcelet: 18-20% protéines, 40-50 kg/porc
- Croissance: 16-18% protéines, 80-100 kg/porc
- Finition: 14-16% protéines, 120-150 kg/porc

**2. Aliments fermiers**
- Maïs (60%): 120 FCFA/kg
- Tourteau soja (20%): 250 FCFA/kg
- Son de blé (10%): 80 FCFA/kg
- CMV (5%): 400 FCFA/kg
- Coût moyen: 150-180 FCFA/kg

**3. Aliments alternatifs**
- Drêche brasserie: 20-40 FCFA/kg
- Issues rizerie: 60-80 FCFA/kg
- Manioc: 50-70 FCFA/kg

📊 **Coûts engraissement (30→110 kg):**
- Aliment industriel: 240 kg × 225 = 54 000 FCFA
- Aliment fermier: 240 kg × 165 = 39 600 FCFA
- Économie: 14 400 FCFA/porc (26%)

💡 **Stratégies d'optimisation:**
1. Alimentation bi-phase: -10-15%
2. Alimentation rationnée: -5-10%
3. Incorporation sous-produits (max 30%): -20-30%
4. Fabrication ferme: -25-35%

📈 **Plan alimentaire 180 jours:**
- J0-30: Aliment porcelet (1,5 kg/jour)
- J30-90: Aliment croissance (2,0 kg/jour)
- J90-180: Aliment finition (2,8 kg/jour)
- Total: ~417 kg, coût ~70 000 FCFA/porc`
  },
  {
    id: 'sante',
    title: 'Prophylaxie et santé',
    keywords: ['vaccin', 'vaccination', 'déparasitage', 'maladie', 'santé', 'vétérinaire', 'traitement', 'hygiène', 'biosécurité', 'peste porcine', 'rouget'],
    category: 'sante',
    content: `**Programme sanitaire complet:**

💉 **Calendrier vaccination:**

**Truies reproductrices**
- Rouget: Tous les 6 mois
- Parvovirose: Tous les 6 mois
- Coût: 2 000-3 000 FCFA/dose

**Porcelets**
- Semaine 3: Fer injectable (anémie)
- Semaine 8: Rouget + Parvovirose
- Semaine 12: Rappel
- Coût total: 1 500-2 500 FCFA/porcelet

🐛 **Déparasitage:**
- Interne (vers): Tous les 3 mois, 500-1 000 FCFA/porc
- Externe (gale, poux): Selon besoin, 300-800 FCFA/porc

🧹 **Hygiène et biosécurité:**
- Nettoyage après chaque bande
- Vide sanitaire: 7-10 jours
- Pédiluve à l'entrée
- Quarantaine nouveaux animaux: 15 jours

🏥 **Pharmacie de base:**
- Thermomètre, seringues, aiguilles: 20 000 FCFA
- Antibiotiques, anti-inflammatoires: 35 000 FCFA

📊 **Budget sanitaire annuel (50 porcs):**
- Vaccinations: 125 000 FCFA
- Déparasitage: 25 000 FCFA
- Désinfection: 30 000 FCFA
- Vétérinaire: 150 000 FCFA
- Total: 380 000 FCFA (15% coût total)

⚠️ **Maladies principales:**
- Diarrhée néonatale: Hygiène + vaccin truie
- Peste porcine africaine: Biosécurité stricte (pas de traitement)
- Rouget: Vaccination + pénicilline`
  },
  {
    id: 'finance',
    title: 'Gestion financière',
    keywords: ['coût', 'rentabilité', 'investissement', 'marge', 'bénéfice', 'budget', 'fonds roulement', 'ROI', 'seuil rentabilité'],
    category: 'finance',
    content: `**Comptabilité et rentabilité:**

💰 **Coûts engraissement (1 porc 30→110kg):**

**Coûts variables (70-75%)**
- Achat porcelet 30kg: 30 000 FCFA
- Aliment (240kg): 48 000 FCFA
- Santé: 3 000 FCFA
- Eau, électricité: 2 000 FCFA
- Total CV: 83 000 FCFA

**Coûts fixes (25-30%)**
- Amortissement: 5 000 FCFA
- Main d'œuvre: 8 000 FCFA
- Entretien: 4 000 FCFA
- Total CF: 17 000 FCFA

**Coût total: 100 000 FCFA**
**Vente 110 kg × 1 300 FCFA = 143 000 FCFA**
**Marge brute: 43 000 FCFA/porc (43%)**

📊 **Investissements initiaux:**
- Engraissement 20 porcs: 1 500 000 FCFA
- Naisseur 5 truies: 4 000 000 FCFA
- Cycle complet 10 truies: 9 200 000 FCFA

💵 **Fonds de roulement (6 mois):**
- Engraissement 20 porcs: 1 620 000 FCFA
- Naisseur 5 truies: 1 250 000 FCFA

📈 **Rentabilité:**
- Engraissement: Point mort 8-10 porcs/an, ROI 1,2 ans
- Naisseur: Point mort 3 truies, ROI 1,7 ans

**Indicateurs clés:**
- Marge brute > 40%
- Mortalité < 5%
- IC < 3,2
- GMQ > 700 g/jour`
  },
  {
    id: 'commerce',
    title: 'Commercialisation',
    keywords: ['vente', 'vendre', 'prix', 'marché', 'client', 'acheteur', 'restaurant', 'boucherie', 'marketing'],
    category: 'commerce',
    content: `**Stratégies de vente et débouchés:**

🎯 **Canaux de commercialisation:**

**1. Vente directe particuliers**
- Prix: 1 300-1 500 FCFA/kg vif
- Avantages: Meilleur prix, paiement immédiat
- Stratégies: Bouche-à-oreille, réseaux sociaux

**2. Restaurants et hôtels**
- Prix: 1 200-1 400 FCFA/kg
- Contrats possibles, volumes réguliers
- Exigences: Certificat vétérinaire, régularité

**3. Boucheries et charcuteries**
- Prix: 1 100-1 300 FCFA/kg
- Gros volumes, débouché stable

**4. Marchés de bétail**
- Prix: 1 000-1 200 FCFA/kg
- Commission: 5-10%

**5. Collecteurs**
- Prix: 900-1 100 FCFA/kg
- Vente à la ferme, pas de transport

📊 **Périodes fastes (+20-30%):**
- Décembre-Janvier (Fêtes)
- Avril (Pâques)
- Mariages, cérémonies

💼 **Poids optimaux de vente:**
- Particuliers: 90-110 kg
- Restaurants: 100-120 kg
- Charcuterie: 120-150 kg

📱 **Marketing:**
- Page Facebook, WhatsApp Business
- Réductions fidélité (-5%)
- Parrainage, offres fêtes
- Différenciation: Alimentation naturelle, traçabilité`
  },
  {
    id: 'reglementation',
    title: 'Réglementation',
    keywords: ['règlement', 'loi', 'obligation', 'déclaration', 'normes', 'sanitaire', 'environnement', 'bien-être', 'fiscalité', 'impôt'],
    category: 'reglementation',
    content: `**Cadre légal et bonnes pratiques:**

📜 **Obligations administratives:**
- Déclaration élevage: Direction Services Vétérinaires
- Numéro d'identification obligatoire
- Registre d'élevage (conservation 5 ans):
  • Entrées/sorties animaux
  • Traitements médicaux
  • Mortalités

🏛️ **Normes sanitaires:**
- Contrôle vétérinaire annuel
- Abattage en abattoir agréé
- Traçabilité: Boucles auriculaires

🌍 **Normes environnementales:**
- Fosse à lisier étanche
- Distance habitations: 50m minimum
- Gestion nuisances (odeurs, bruit)

⚖️ **Bien-être animal:**
- Espace minimum: 0,65-1 m²/porc (50-110 kg)
- Truie gestante: 2 m²
- Truie allaitante: 5 m² + cases
- Sol non glissant, ventilation suffisante

💼 **Fiscalité:**
- CA < 15M: Régime simplifié
- Charges déductibles: Aliments, soins véto, amortissements

⚠️ **Sanctions possibles:**
- Amendes: 50 000-500 000 FCFA
- Fermeture temporaire/définitive

💡 **Bonnes pratiques:**
✅ Registres à jour
✅ Respecter distances
✅ Formation continue
✅ Réseau éleveurs`
  }
];

/**
 * Recherche dans la base de connaissances
 */
export function searchKnowledge(query: string): KnowledgeTopic[] {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/);
  
  // Calculer un score pour chaque topic
  const scored = TRAINING_KNOWLEDGE_BASE.map(topic => {
    let score = 0;
    
    // Vérifier les mots-clés
    for (const keyword of topic.keywords) {
      if (queryLower.includes(keyword.toLowerCase())) {
        score += 10;
      }
      // Vérifier chaque mot de la requête
      for (const word of words) {
        if (word.length > 2 && keyword.toLowerCase().includes(word)) {
          score += 5;
        }
      }
    }
    
    // Vérifier le titre
    if (queryLower.includes(topic.title.toLowerCase())) {
      score += 15;
    }
    
    // Vérifier le contenu
    const contentLower = topic.content.toLowerCase();
    for (const word of words) {
      if (word.length > 3 && contentLower.includes(word)) {
        score += 2;
      }
    }
    
    return { topic, score };
  });
  
  // Filtrer et trier par score
  return scored
    .filter(s => s.score > 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.topic);
}

/**
 * Obtient une réponse formatée pour Kouakou
 */
export function getKnowledgeResponse(query: string): string | null {
  const results = searchKnowledge(query);
  
  if (results.length === 0) {
    return null;
  }
  
  // Prendre le meilleur résultat
  const bestMatch = results[0];
  
  // Formater la réponse de manière conversationnelle
  return `📚 **${bestMatch.title}**\n\n${bestMatch.content}`;
}

/**
 * Vérifie si une question concerne la formation/connaissances
 */
export function isKnowledgeQuestion(message: string): boolean {
  const knowledgeIndicators = [
    'comment', 'pourquoi', 'quoi', "qu'est-ce",
    'explique', 'c\'est quoi', 'définition',
    'quel', 'quelle', 'quels', 'quelles',
    'combien coûte', 'combien ça coûte',
    'différence entre', 'avantages', 'inconvénients',
    'conseils', 'recommandations', 'mieux',
    'race', 'alimentation', 'vaccination', 'santé',
    'rentabilité', 'investissement', 'démarrer'
  ];
  
  const messageLower = message.toLowerCase();
  return knowledgeIndicators.some(indicator => messageLower.includes(indicator));
}

export default TRAINING_KNOWLEDGE_BASE;

