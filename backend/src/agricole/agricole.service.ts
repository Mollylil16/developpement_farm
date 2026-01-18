import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AgricoleService {
  constructor(private db: DatabaseService) {}

  // ==================== PERFORMANCES ====================

  async getPerformancesData(period: 'week' | 'month' | 'year' = 'month') {
    let interval: string;
    switch (period) {
      case 'week':
        interval = '7 days';
        break;
      case 'month':
        interval = '30 days';
        break;
      case 'year':
        interval = '365 days';
        break;
      default:
        interval = '30 days';
    }

    // Gain moyen quotidien (g/jour)
    const avgDailyGainResult = await this.db.query(`
      SELECT 
        COALESCE(AVG(
          CASE 
            WHEN previous_weight IS NOT NULL AND previous_date IS NOT NULL 
            THEN (current_weight - previous_weight) / NULLIF(EXTRACT(EPOCH FROM (current_date - previous_date)) / 86400, 0)
            ELSE NULL
          END
        ), 0) * 1000 as average_daily_gain
      FROM (
        SELECT 
          pa.id,
          COALESCE((SELECT poids FROM production_pesees WHERE animal_id = pa.id ORDER BY date_pesee DESC LIMIT 1), pa.poids_initial) as current_weight,
          LAG(COALESCE((SELECT poids FROM production_pesees WHERE animal_id = pa.id ORDER BY date_pesee DESC LIMIT 1), pa.poids_initial)) OVER (PARTITION BY pa.id ORDER BY pa.date_naissance) as previous_weight,
          pa.date_naissance as current_date,
          LAG(pa.date_naissance) OVER (PARTITION BY pa.id ORDER BY pa.date_naissance) as previous_date
        FROM production_animaux pa
        WHERE pa.actif = TRUE
          AND pa.date_naissance >= NOW() - INTERVAL '${interval}'
      ) weight_changes
    `);

    // Indice de conversion alimentaire (kg aliment / kg gain de poids)
    const feedConversionResult = await this.db.query(`
      SELECT 
        COALESCE(
          SUM(r.quantite_ration) / NULLIF(SUM(COALESCE((SELECT poids FROM production_pesees WHERE animal_id = pa.id ORDER BY date_pesee DESC LIMIT 1), pa.poids_initial) - COALESCE(pa.poids_initial, 0)), 0),
          0
        ) as feed_conversion_ratio
      FROM rations r
      JOIN production_animaux pa ON r.projet_id = pa.projet_id
      WHERE r.date_ration >= NOW() - INTERVAL '${interval}'
        AND pa.actif = TRUE
    `);

    // Données pour graphique (évolution dans le temps)
    const trendData = await this.db.query(`
      SELECT 
        DATE_TRUNC('day', pa.date_naissance) as date,
        COUNT(*) as animal_count,
        AVG(pa.poids_actuel) as avg_weight,
        AVG(EXTRACT(EPOCH FROM (NOW() - pa.date_naissance)) / 86400) as avg_age_days
      FROM production_animaux pa
      WHERE pa.actif = TRUE
        AND pa.date_naissance >= NOW() - INTERVAL '${interval}'
      GROUP BY DATE_TRUNC('day', pa.date_naissance)
      ORDER BY date ASC
    `);

    return {
      averageDailyGain: parseFloat(avgDailyGainResult.rows[0]?.average_daily_gain || '0'),
      feedConversionRatio: parseFloat(feedConversionResult.rows[0]?.feed_conversion_ratio || '0'),
      data: trendData.rows.map((row) => ({
        name: new Date(row.date).toLocaleDateString('fr-FR'),
        value: parseFloat(row.avg_weight || '0'),
        animal_count: parseInt(row.animal_count || '0'),
        avg_age_days: parseFloat(row.avg_age_days || '0'),
      })),
    };
  }

  // ==================== SANTÉ ====================

  async getSanteData(period: 'week' | 'month' | 'year' = 'month') {
    let interval: string;
    switch (period) {
      case 'week':
        interval = '7 days';
        break;
      case 'month':
        interval = '30 days';
        break;
      case 'year':
        interval = '365 days';
        break;
      default:
        interval = '30 days';
    }

    // Taux de mortalité
    const mortalityResult = await this.db.query(`
      SELECT 
        COUNT(*) as total_deaths,
        COUNT(DISTINCT projet_id) as affected_projects
      FROM mortalites
      WHERE date >= NOW() - INTERVAL '${interval}'
    `);

    const totalAnimalsResult = await this.db.query(`
      SELECT COUNT(*) as total
      FROM production_animaux
      WHERE actif = TRUE
        AND date_naissance >= NOW() - INTERVAL '${interval}'
    `);

    const totalDeaths = parseInt(mortalityResult.rows[0]?.total_deaths || '0');
    const totalAnimals = parseInt(totalAnimalsResult.rows[0]?.total || '1');
    const mortalityRate = (totalDeaths / totalAnimals) * 100;

    // Consommation d'antibiotiques (2. Consommation d'antibiotiques)
    const antibioticsUsage = await this.db.query(`
      SELECT 
        t.nom_medicament,
        t.type,
        COUNT(*) as usage_count,
        SUM(t.cout) as total_cost,
        AVG(t.duree_jours) as avg_duration_days,
        COUNT(DISTINCT t.projet_id) as affected_projects
      FROM traitements t
      WHERE t.type = 'antibiotique'
        AND t.date_debut >= NOW() - INTERVAL '${interval}'
      GROUP BY t.nom_medicament, t.type
      ORDER BY usage_count DESC
    `);

    const totalAntibioticsUsage = await this.db.query(`
      SELECT 
        COUNT(*) as total_treatments,
        COUNT(DISTINCT projet_id) as projects_with_antibiotics,
        SUM(cout) as total_cost
      FROM traitements
      WHERE type = 'antibiotique'
        AND date_debut >= NOW() - INTERVAL '${interval}'
    `);

    // Incidents sanitaires
    const incidents = await this.db.query(`
      SELECT 
        m.id,
        m.date_mortalite as date,
        m.cause as type,
        m.notes as description,
        p.nom as projet_nom
      FROM mortalites m
      LEFT JOIN projets p ON m.projet_id = p.id
      WHERE m.date_mortalite >= NOW() - INTERVAL '${interval}'
      ORDER BY m.date_mortalite DESC
      LIMIT 50
    `);

    // Maladies les plus fréquentes (3. Incidents sanitaires et maladies)
    const diseases = await this.db.query(`
      SELECT 
        nom_maladie as disease_name,
        type as disease_type,
        COUNT(*) as occurrence_count,
        COUNT(DISTINCT projet_id) as affected_projects
      FROM maladies
      WHERE date_debut >= NOW() - INTERVAL '${interval}'
      GROUP BY nom_maladie, type
      ORDER BY occurrence_count DESC
      LIMIT 10
    `);

    // Gestion des cadavres (18. Gestion des cadavres)
    const cadaversManagement = await this.db.query(`
      SELECT 
        m.id,
        m.date_mortalite,
        m.cause,
        m.notes as disposal_method,
        p.nom as projet_nom
      FROM mortalites m
      LEFT JOIN projets p ON m.projet_id = p.id
      WHERE m.date_mortalite >= NOW() - INTERVAL '${interval}'
      ORDER BY m.date_mortalite DESC
      LIMIT 100
    `);

    return {
      mortalityRate: mortalityRate,
      totalDeaths,
      totalAnimals,
      incidents: incidents.rows,
      diseases: diseases.rows,
      antibioticsUsage: {
        details: antibioticsUsage.rows,
        total: {
          treatments: parseInt(totalAntibioticsUsage.rows[0]?.total_treatments || '0'),
          projects: parseInt(totalAntibioticsUsage.rows[0]?.projects_with_antibiotics || '0'),
          totalCost: parseFloat(totalAntibioticsUsage.rows[0]?.total_cost || '0'),
        },
      },
      cadaversManagement: cadaversManagement.rows,
    };
  }

  // ==================== REPRODUCTION ====================

  async getReproductionData() {
    // Taux de mise bas
    const birthRateResult = await this.db.query(`
      SELECT 
        COUNT(DISTINCT g.id) as total_gestations,
        COUNT(DISTINCT CASE WHEN g.date_mise_bas IS NOT NULL THEN g.id END) as successful_births
      FROM gestations g
      WHERE g.date_insemination >= NOW() - INTERVAL '1 year'
    `);

    const totalGestations = parseInt(birthRateResult.rows[0]?.total_gestations || '0');
    const successfulBirths = parseInt(birthRateResult.rows[0]?.successful_births || '0');
    const birthRate = totalGestations > 0 ? (successfulBirths / totalGestations) * 100 : 0;

    // Porcelets sevrés par truie
    const pigletsPerSowResult = await this.db.query(`
      SELECT 
        AVG(COALESCE(s.nombre_porcelets_sevres, 0)) as avg_piglets_per_sow
      FROM sevrages s
      JOIN gestations g ON s.gestation_id = g.id
      WHERE s.date_sevrage >= NOW() - INTERVAL '1 year'
    `);

    return {
      birthRate: birthRate,
      pigletsPerSow: parseFloat(pigletsPerSowResult.rows[0]?.avg_piglets_per_sow || '0'),
      totalGestations,
      successfulBirths,
    };
  }

  // ==================== NUTRITION ====================

  async getNutritionData() {
    // Composition des aliments (6. Composition et provenance des aliments)
    const feedComposition = await this.db.query(`
      SELECT 
        r.id,
        r.date_ration,
        r.quantite_ration,
        COUNT(DISTINCT ir.ingredient_id) as ingredient_count,
        p.nom as projet_nom
      FROM rations r
      LEFT JOIN ingredients_ration ir ON r.id = ir.ration_id
      LEFT JOIN projets p ON r.projet_id = p.id
      WHERE r.date_ration >= NOW() - INTERVAL '6 months'
      GROUP BY r.id, r.date_ration, r.quantite_ration, p.nom
      ORDER BY r.date_ration DESC
      LIMIT 100
    `);

    // Provenance des ingrédients (6. Composition et provenance des aliments)
    const ingredientOrigins = await this.db.query(`
      SELECT 
        i.nom as ingredient_name,
        i.provenance,
        i.fournisseur,
        COUNT(DISTINCT ir.ration_id) as usage_count,
        SUM(ir.quantite_kg) as total_quantity_kg
      FROM ingredients i
      LEFT JOIN ingredients_ration ir ON i.id = ir.ingredient_id
      WHERE ir.ration_id IS NOT NULL
        OR i.date_creation >= NOW() - INTERVAL '6 months'
      GROUP BY i.id, i.nom, i.provenance, i.fournisseur
      ORDER BY total_quantity_kg DESC NULLS LAST
      LIMIT 50
    `);

    // Utilisation d'additifs alimentaires (16. Utilisation d'additifs alimentaires)
    const additives = await this.db.query(`
      SELECT 
        i.nom as additive_name,
        i.type as additive_type,
        i.provenance,
        COUNT(DISTINCT ir.ration_id) as usage_count,
        SUM(ir.quantite_kg) as total_quantity_kg,
        COUNT(DISTINCT r.projet_id) as projects_using
      FROM ingredients i
      LEFT JOIN ingredients_ration ir ON i.id = ir.ingredient_id
      LEFT JOIN rations r ON ir.ration_id = r.id
      WHERE (i.type ILIKE '%additif%' 
        OR i.type ILIKE '%conservateur%'
        OR i.type ILIKE '%antibiotique%'
        OR i.nom ILIKE '%additif%')
        AND (ir.ration_id IS NOT NULL OR i.date_creation >= NOW() - INTERVAL '1 year')
      GROUP BY i.id, i.nom, i.type, i.provenance
      ORDER BY total_quantity_kg DESC NULLS LAST
      LIMIT 30
    `);

    // Gestion des déjections (7. Gestion des déjections) - Calcul estimatif
    const wasteManagement = await this.db.query(`
      SELECT 
        p.id as projet_id,
        p.nom as projet_nom,
        COUNT(DISTINCT pa.id) as animal_count,
        COUNT(DISTINCT pa.id) * 3.5 as estimated_daily_waste_kg -- Estimation: 3.5 kg/jour/animal
      FROM projets p
      LEFT JOIN production_animaux pa ON p.id = pa.projet_id AND pa.actif = TRUE
      GROUP BY p.id, p.nom
      ORDER BY animal_count DESC
    `);

    return {
      feedComposition: feedComposition.rows,
      origins: ingredientOrigins.rows,
      additives: additives.rows,
      wasteManagement: {
        farms: wasteManagement.rows,
        totalDailyWaste: wasteManagement.rows.reduce((sum, row) => sum + parseFloat(row.estimated_daily_waste_kg || '0'), 0),
      },
    };
  }

  // ==================== VACCINATION ====================

  async getVaccinationData() {
    // Programmes vaccinaux
    const programs = await this.db.query(`
      SELECT 
        v.id,
        v.nom_vaccin,
        v.date_vaccination,
        COUNT(DISTINCT v.animal_id) as vaccinated_count
      FROM vaccinations v
      WHERE v.date_vaccination >= NOW() - INTERVAL '1 year'
      GROUP BY v.id, v.nom_vaccin, v.date_vaccination
      ORDER BY v.date_vaccination DESC
      LIMIT 50
    `);

    // Couverture vaccinale
    const totalAnimals = await this.db.query(`
      SELECT COUNT(*) as total
      FROM production_animaux
      WHERE actif = TRUE
    `);

    const vaccinatedAnimals = await this.db.query(`
      SELECT COUNT(DISTINCT animal_id) as total
      FROM vaccinations
      WHERE date_vaccination >= NOW() - INTERVAL '1 year'
    `);

    const total = parseInt(totalAnimals.rows[0]?.total || '0');
    const vaccinated = parseInt(vaccinatedAnimals.rows[0]?.total || '0');
    const coverage = total > 0 ? (vaccinated / total) * 100 : 0;

    return {
      programs: programs.rows,
      coverage: coverage,
      totalAnimals: total,
      vaccinatedAnimals: vaccinated,
    };
  }

  // ==================== TRAÇABILITÉ ====================

  async getTracabiliteData() {
    // Traçabilité des animaux (13. Traçabilité des animaux)
    const movements = await this.db.query(`
      SELECT 
        pa.id as animal_id,
        pa.projet_id,
        p.nom as projet_nom,
        pa.date_naissance,
        pa.poids_actuel,
        pa.sexe,
        pa.categorie,
        COALESCE(pa.poids_naissance, 0) as birth_weight
      FROM production_animaux pa
      JOIN projets p ON pa.projet_id = p.id
      WHERE pa.actif = TRUE
      ORDER BY pa.date_naissance DESC
      LIMIT 200
    `);

    // Origines des animaux
    const origins = await this.db.query(`
      SELECT 
        CASE 
          WHEN pa.date_naissance IS NOT NULL THEN 'naissance'
          WHEN rv.type = 'achat' THEN 'achat'
          ELSE 'inconnu'
        END as origin_type,
        COUNT(*) as count,
        p.nom as projet_nom
      FROM production_animaux pa
      JOIN projets p ON pa.projet_id = p.id
      LEFT JOIN revenus rv ON pa.projet_id = rv.projet_id AND rv.type = 'achat'
      WHERE pa.actif = TRUE
      GROUP BY origin_type, p.nom
      ORDER BY count DESC
    `);

    // Données d'abattage (14. Données d'abattage)
    const slaughterData = await this.db.query(`
      SELECT 
        rv.id,
        rv.date_revenu as slaughter_date,
        rv.montant as price,
        rv.quantite as quantity,
        rv.poids_total_kg as weight_kg,
        rv.prix_kg_vif,
        p.nom as projet_nom,
        rv.notes as details
      FROM revenus rv
      JOIN projets p ON rv.projet_id = p.id
      WHERE (rv.type = 'vente' OR rv.type = 'abattage' OR rv.notes ILIKE '%abatt%')
        AND rv.date_revenu >= NOW() - INTERVAL '1 year'
      ORDER BY rv.date_revenu DESC
      LIMIT 100
    `);

    return {
      movements: movements.rows,
      origins: origins.rows,
      slaughterData: slaughterData.rows,
      totalSlaughtered: slaughterData.rows.reduce((sum, row) => sum + parseFloat(row.weight_kg || '0'), 0),
    };
  }

  // ==================== ÉCONOMIE ====================

  async getEconomieData() {
    // Coûts de production
    const productionCosts = await this.db.query(`
      SELECT 
        COALESCE(SUM(dp.montant), 0) as total_depenses,
        COALESCE(SUM(rv.montant), 0) as total_revenus
      FROM depenses_ponctuelles dp
      FULL OUTER JOIN revenus rv ON 1=1
      WHERE dp.date_depense >= NOW() - INTERVAL '1 year'
         OR rv.date_revenu >= NOW() - INTERVAL '1 year'
    `);

    const costs = parseFloat(productionCosts.rows[0]?.total_depenses || '0');
    const revenues = parseFloat(productionCosts.rows[0]?.total_revenus || '0');
    const profitability = revenues > 0 ? ((revenues - costs) / revenues) * 100 : 0;

    return {
      productionCosts: costs,
      revenues: revenues,
      profitability: profitability,
      data: [], // Données détaillées si nécessaire
    };
  }

  // ==================== CARTOGRAPHIE ====================

  async getCartographieData() {
    // Effectifs par type de production (19. Effectifs par type de production)
    const farmsByType = await this.db.query(`
      SELECT 
        p.localisation,
        COUNT(DISTINCT p.id) as farm_count,
        COUNT(DISTINCT pa.id) as animal_count,
        p.management_method,
        COUNT(DISTINCT CASE WHEN pa.categorie = 'truie' THEN pa.id END) as truie_count,
        COUNT(DISTINCT CASE WHEN pa.categorie = 'verrat' THEN pa.id END) as verrat_count,
        COUNT(DISTINCT CASE WHEN pa.categorie = 'porcelet' THEN pa.id END) as porcelet_count,
        COUNT(DISTINCT CASE WHEN pa.categorie = 'croissance' THEN pa.id END) as croissance_count,
        COUNT(DISTINCT CASE WHEN pa.categorie = 'engraissement' THEN pa.id END) as engraissement_count
      FROM projets p
      LEFT JOIN production_animaux pa ON p.id = pa.projet_id AND pa.actif = TRUE
      GROUP BY p.localisation, p.management_method
      ORDER BY animal_count DESC
    `);

    // Densité d'élevage et conditions de logement (9. Densité d'élevage et conditions de logement)
    const housingDensity = await this.db.query(`
      SELECT 
        p.id as projet_id,
        p.nom as projet_nom,
        p.localisation,
        COUNT(DISTINCT pa.id) as animal_count,
        p.nombre_truies,
        p.nombre_verrats,
        p.nombre_porcelets,
        p.nombre_croissance,
        COALESCE(
          (p.nombre_truies + p.nombre_verrats + p.nombre_porcelets + p.nombre_croissance)::FLOAT / NULLIF(p.nombre_truies, 0),
          0
        ) as density_ratio,
        p.management_method
      FROM projets p
      LEFT JOIN production_animaux pa ON p.id = pa.projet_id AND pa.actif = TRUE
      GROUP BY p.id, p.nom, p.localisation, p.nombre_truies, p.nombre_verrats, 
               p.nombre_porcelets, p.nombre_croissance, p.management_method
      ORDER BY animal_count DESC
    `);

    // Consommation d'eau (10. Consommation d'eau)
    const waterConsumption = await this.db.query(`
      SELECT 
        cf.projet_id,
        p.nom as projet_nom,
        SUM(cf.montant) as total_cost,
        COUNT(*) as billing_periods,
        AVG(cf.montant) as avg_monthly_cost
      FROM charges_fixes cf
      JOIN projets p ON cf.projet_id = p.id
      WHERE (cf.categorie = 'eau' OR cf.categorie = 'eau_electricite' OR cf.description ILIKE '%eau%')
        AND cf.date_debut >= NOW() - INTERVAL '1 year'
      GROUP BY cf.projet_id, p.nom
      ORDER BY total_cost DESC
    `);

    // Consommation énergétique (11. Consommation énergétique)
    const energyConsumption = await this.db.query(`
      SELECT 
        cf.projet_id,
        p.nom as projet_nom,
        SUM(cf.montant) as total_cost,
        COUNT(*) as billing_periods,
        AVG(cf.montant) as avg_monthly_cost
      FROM charges_fixes cf
      JOIN projets p ON cf.projet_id = p.id
      WHERE (cf.categorie = 'electricite' OR cf.categorie = 'eau_electricite' OR cf.description ILIKE '%électricité%' OR cf.description ILIKE '%énergie%')
        AND cf.date_debut >= NOW() - INTERVAL '1 year'
      GROUP BY cf.projet_id, p.nom
      ORDER BY total_cost DESC
    `);

    // Émissions d'ammoniac et gaz à effet de serre (8. Émissions d'ammoniac et GES) - Estimation
    const emissions = await this.db.query(`
      SELECT 
        p.id as projet_id,
        p.nom as projet_nom,
        COUNT(DISTINCT pa.id) as animal_count,
        COUNT(DISTINCT pa.id) * 4.5 as estimated_ammonia_kg_per_year, -- Estimation: 4.5 kg NH3/an/animal
        COUNT(DISTINCT pa.id) * 650 as estimated_co2_kg_per_year -- Estimation: 650 kg CO2/an/animal
      FROM projets p
      LEFT JOIN production_animaux pa ON p.id = pa.projet_id AND pa.actif = TRUE
      GROUP BY p.id, p.nom
      ORDER BY animal_count DESC
    `);

    // Pratiques de biosécurité (15. Pratiques de biosécurité) - Basique, peut être étendu
    const biosecurity = await this.db.query(`
      SELECT 
        p.id as projet_id,
        p.nom as projet_nom,
        COUNT(DISTINCT v.id) as vaccination_count,
        COUNT(DISTINCT m.id) as disease_outbreak_count,
        CASE 
          WHEN COUNT(DISTINCT v.id) > 10 THEN 'Élevé'
          WHEN COUNT(DISTINCT v.id) > 5 THEN 'Moyen'
          ELSE 'Faible'
        END as biosecurity_level
      FROM projets p
      LEFT JOIN vaccinations v ON p.id = v.projet_id AND v.date_vaccination >= NOW() - INTERVAL '1 year'
      LEFT JOIN maladies m ON p.id = m.projet_id AND m.date_debut >= NOW() - INTERVAL '1 year' AND m.contagieux = TRUE
      GROUP BY p.id, p.nom
      ORDER BY vaccination_count DESC, disease_outbreak_count ASC
    `);

    return {
      farms: farmsByType.rows,
      locations: farmsByType.rows.map((row) => ({
        location: row.localisation,
        farmCount: parseInt(row.farm_count || '0'),
        animalCount: parseInt(row.animal_count || '0'),
        managementMethod: row.management_method,
      })),
      housingDensity: housingDensity.rows,
      waterConsumption: waterConsumption.rows,
      energyConsumption: energyConsumption.rows,
      emissions: emissions.rows,
      biosecurity: biosecurity.rows,
    };
  }

  // ==================== CERTIFICATIONS ====================

  async getCertificationsData() {
    // Adoption de labels et certifications (20. Adoption de labels et certifications)
    // Pour l'instant, structure de base car les certifications ne sont pas encore implémentées en détail
    
    // On peut identifier les projets qui ont des pratiques conformes
    const certificationsPreview = await this.db.query(`
      SELECT 
        p.id as projet_id,
        p.nom as projet_nom,
        p.localisation,
        CASE 
          WHEN COUNT(DISTINCT v.id) > 20 AND COUNT(DISTINCT m.id) < 5 THEN 'Bio'
          WHEN COUNT(DISTINCT v.id) > 10 THEN 'Conventionnel amélioré'
          ELSE 'Conventionnel'
        END as certification_type,
        COUNT(DISTINCT v.id) as vaccination_count,
        COUNT(DISTINCT m.id) as disease_count
      FROM projets p
      LEFT JOIN vaccinations v ON p.id = v.projet_id
      LEFT JOIN maladies m ON p.id = m.projet_id AND m.date_debut >= NOW() - INTERVAL '1 year'
      GROUP BY p.id, p.nom, p.localisation
      ORDER BY vaccination_count DESC
    `);

    // Labels possibles (structure pour futur)
    const labels = [
      { name: 'Agriculture Biologique', code: 'BIO', description: 'Production sans produits chimiques' },
      { name: 'Label Rouge', code: 'LR', description: 'Qualité supérieure' },
      { name: 'HVE', code: 'HVE', description: 'Haute Valeur Environnementale' },
    ];

    return {
      certifications: certificationsPreview.rows,
      labels: labels,
      totalCertifiedFarms: certificationsPreview.rows.filter((row: any) => 
        row.certification_type && row.certification_type !== 'Conventionnel'
      ).length,
    };
  }
}
