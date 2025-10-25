import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Porc, Gestation, Transaction, Projet, Utilisateur, DeviseConfig } from '../types';
import { CalculsAgricoles } from '../utils/calculs';

export interface RapportPDFData {
  projet: Projet;
  utilisateurActuel: Utilisateur;
  periode: {
    debut: Date;
    fin: Date;
  };
  porcs: Porc[];
  gestations: Gestation[];
  transactions: Transaction[];
  deviseConfig: DeviseConfig;
}

export interface RapportPDFOptions {
  type: 'complet' | 'finance' | 'production' | 'reproduction' | 'nutrition';
  includeCharts: boolean;
  includeDetails: boolean;
  language: 'fr' | 'en';
}

export class PDFGeneratorService {
  /**
   * Génère un rapport PDF complet
   */
  static async genererRapportComplet(
    data: RapportPDFData,
    options: RapportPDFOptions = {
      type: 'complet',
      includeCharts: true,
      includeDetails: true,
      language: 'fr',
    }
  ): Promise<string> {
    const fileName = `Rapport_Ferme_${this.formatDateForFileName(data.periode.debut)}_${this.formatDateForFileName(data.periode.fin)}.pdf`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    // Générer le contenu PDF
    const pdfContent = await this.genererContenuPDF(data, options);
    
    // Créer le fichier PDF (simulation - en réalité, utiliserait une vraie librairie PDF)
    await FileSystem.writeAsStringAsync(filePath, pdfContent, { encoding: FileSystem.EncodingType.UTF8 });
    
    return filePath;
  }

  /**
   * Génère le contenu PDF structuré
   */
  private static async genererContenuPDF(data: RapportPDFData, options: RapportPDFOptions): Promise<string> {
    const sections = [];

    // En-tête du document
    sections.push(this.genererEnTete(data, options));
    
    // Table des matières
    sections.push(this.genererTableDesMatieres(options));
    
    // Résumé exécutif
    sections.push(this.genererResumeExecutif(data, options));
    
    // Données financières
    if (options.type === 'complet' || options.type === 'finance') {
      sections.push(this.genererSectionFinanciere(data, options));
    }
    
    // Données de production
    if (options.type === 'complet' || options.type === 'production') {
      sections.push(this.genererSectionProduction(data, options));
    }
    
    // Données de reproduction
    if (options.type === 'complet' || options.type === 'reproduction') {
      sections.push(this.genererSectionReproduction(data, options));
    }
    
    // Données nutritionnelles
    if (options.type === 'complet' || options.type === 'nutrition') {
      sections.push(this.genererSectionNutrition(data, options));
    }
    
    // Annexes
    if (options.includeDetails) {
      sections.push(this.genererAnnexes(data, options));
    }
    
    // Pied de page
    sections.push(this.genererPiedDePage(data, options));

    return sections.join('\n\n');
  }

  /**
   * Génère l'en-tête du document
   */
  private static genererEnTete(data: RapportPDFData, options: RapportPDFOptions): string {
    const dateGeneration = new Date().toLocaleDateString('fr-FR');
    const periode = `${data.periode.debut.toLocaleDateString('fr-FR')} - ${data.periode.fin.toLocaleDateString('fr-FR')}`;
    
    return `
================================================================================
                                RAPPORT D'ACTIVITÉ
                              ÉLEVAGE PORCIN PROFESSIONNEL
================================================================================

PROJET: ${data.projet.nom}
PROPRIÉTAIRE: ${data.projet.proprietaireNom}
PÉRIODE: ${periode}
DATE DE GÉNÉRATION: ${dateGeneration}
GÉNÉRÉ PAR: ${data.utilisateurActuel.nom}
TYPE DE RAPPORT: ${this.getTypeRapportLabel(options.type)}

================================================================================
`;
  }

  /**
   * Génère la table des matières
   */
  private static genererTableDesMatieres(options: RapportPDFOptions): string {
    const sections = ['1. RÉSUMÉ EXÉCUTIF'];
    let sectionNumber = 2;

    if (options.type === 'complet' || options.type === 'finance') {
      sections.push(`${sectionNumber}. ANALYSE FINANCIÈRE`);
      sectionNumber++;
    }
    
    if (options.type === 'complet' || options.type === 'production') {
      sections.push(`${sectionNumber}. ANALYSE DE PRODUCTION`);
      sectionNumber++;
    }
    
    if (options.type === 'complet' || options.type === 'reproduction') {
      sections.push(`${sectionNumber}. ANALYSE DE REPRODUCTION`);
      sectionNumber++;
    }
    
    if (options.type === 'complet' || options.type === 'nutrition') {
      sections.push(`${sectionNumber}. ANALYSE NUTRITIONNELLE`);
      sectionNumber++;
    }
    
    if (options.includeDetails) {
      sections.push(`${sectionNumber}. ANNEXES DÉTAILLÉES`);
    }

    return `
TABLE DES MATIÈRES
================================================================================

${sections.join('\n')}

================================================================================
`;
  }

  /**
   * Génère le résumé exécutif
   */
  private static genererResumeExecutif(data: RapportPDFData, options: RapportPDFOptions): string {
    const kpis = CalculsAgricoles.calculerKPIs(data.porcs, data.gestations, data.transactions);
    const rapportFinancier = CalculsAgricoles.genererRapportFinancier(data.transactions, data.periode);
    const gestationsEnCours = data.gestations.filter(g => g.statut === 'en_cours');
    const gestationsTerminees = data.gestations.filter(g => g.statut === 'terminee');
    
    return `
1. RÉSUMÉ EXÉCUTIF
================================================================================

VUE D'ENSEMBLE DE L'ÉLEVAGE
--------------------------------------------------------------------------------
Effectif total: ${data.porcs.length} porcs
• Truies en gestation: ${kpis.truiesGestantes}
• Porcs en croissance: ${Array.isArray(kpis.porcsEnCroissance) ? kpis.porcsEnCroissance.length : kpis.porcsEnCroissance}
• Porcs à vendre: ${kpis.porcsAVendre}

PERFORMANCE FINANCIÈRE
--------------------------------------------------------------------------------
Chiffre d'affaires: ${CalculsAgricoles.formaterMontant(rapportFinancier.chiffreAffaires, data.deviseConfig)}
Dépenses totales: ${CalculsAgricoles.formaterMontant(rapportFinancier.depensesTotal, data.deviseConfig)}
Marge brute: ${CalculsAgricoles.formaterMontant(rapportFinancier.margeBrute, data.deviseConfig)}
Marge brute (%): ${rapportFinancier.margeBrutePourcentage.toFixed(2)}%

PERFORMANCE DE REPRODUCTION
--------------------------------------------------------------------------------
Gestations en cours: ${gestationsEnCours.length}
Gestations terminées: ${gestationsTerminees.length}
Total gestations: ${data.gestations.length}

INDICATEURS CLÉS
--------------------------------------------------------------------------------
• Poids moyen: ${kpis.poidsMoyen} kg
• Taux de mortalité: ${kpis.tauxMortalite}%
• Chiffre d'affaires mensuel: ${CalculsAgricoles.formaterMontant(kpis.chiffreAffairesMensuel, data.deviseConfig)}

================================================================================
`;
  }

  /**
   * Génère la section financière
   */
  private static genererSectionFinanciere(data: RapportPDFData, options: RapportPDFOptions): string {
    const rapportFinancier = CalculsAgricoles.genererRapportFinancier(data.transactions, data.periode);
    const transactionsVentes = data.transactions.filter(t => t.type === 'vente');
    const transactionsDepenses = data.transactions.filter(t => t.type === 'depense');
    
    return `
2. ANALYSE FINANCIÈRE
================================================================================

RÉSULTATS FINANCIERS
--------------------------------------------------------------------------------
Chiffre d'affaires total: ${CalculsAgricoles.formaterMontant(rapportFinancier.chiffreAffaires, data.deviseConfig)}
Dépenses totales: ${CalculsAgricoles.formaterMontant(rapportFinancier.depensesTotal, data.deviseConfig)}
Marge brute: ${CalculsAgricoles.formaterMontant(rapportFinancier.margeBrute, data.deviseConfig)}
Marge brute (%): ${rapportFinancier.margeBrutePourcentage.toFixed(2)}%

DÉTAIL DES DÉPENSES
--------------------------------------------------------------------------------
Coûts d'alimentation: ${CalculsAgricoles.formaterMontant(rapportFinancier.depensesAlimentation, data.deviseConfig)}
Coûts vétérinaires: ${CalculsAgricoles.formaterMontant(rapportFinancier.depensesVeterinaires, data.deviseConfig)}
Autres dépenses: ${CalculsAgricoles.formaterMontant(rapportFinancier.depensesTotal - rapportFinancier.depensesAlimentation - rapportFinancier.depensesVeterinaires, data.deviseConfig)}

ANALYSE DES VENTES
--------------------------------------------------------------------------------
Nombre de ventes: ${transactionsVentes.length}
Montant moyen par vente: ${CalculsAgricoles.formaterMontant(transactionsVentes.length > 0 ? rapportFinancier.chiffreAffaires / transactionsVentes.length : 0, data.deviseConfig)}

TOP 5 DES VENTES
--------------------------------------------------------------------------------
${transactionsVentes
  .sort((a, b) => b.montant - a.montant)
  .slice(0, 5)
  .map((t, index) => `${index + 1}. ${t.description} - ${CalculsAgricoles.formaterMontant(t.montant, data.deviseConfig)} (${t.date.toLocaleDateString('fr-FR')})`)
  .join('\n')}

================================================================================
`;
  }

  /**
   * Génère la section production
   */
  private static genererSectionProduction(data: RapportPDFData, options: RapportPDFOptions): string {
    const kpis = CalculsAgricoles.calculerKPIs(data.porcs, data.gestations, data.transactions);
    const rapportProduction = CalculsAgricoles.genererRapportProduction(data.gestations, [], data.transactions);
    
    return `
3. ANALYSE DE PRODUCTION
================================================================================

EFFECTIF ET RÉPARTITION
--------------------------------------------------------------------------------
Effectif total: ${data.porcs.length} porcs
• Truies en gestation: ${kpis.truiesGestantes}
• Porcs en croissance: ${Array.isArray(kpis.porcsEnCroissance) ? kpis.porcsEnCroissance.length : kpis.porcsEnCroissance}
• Porcs à vendre: ${kpis.porcsAVendre}

PERFORMANCE DE CROISSANCE
--------------------------------------------------------------------------------
Poids moyen: ${kpis.poidsMoyen} kg
Taux de mortalité: ${kpis.tauxMortalite}%

ANALYSE PAR RACE
--------------------------------------------------------------------------------
${this.analyserParRace(data.porcs)}

ANALYSE PAR ÂGE
--------------------------------------------------------------------------------
${this.analyserParAge(data.porcs)}

================================================================================
`;
  }

  /**
   * Génère la section reproduction
   */
  private static genererSectionReproduction(data: RapportPDFData, options: RapportPDFOptions): string {
    const kpis = CalculsAgricoles.calculerKPIs(data.porcs, data.gestations, data.transactions);
    const gestationsEnCours = data.gestations.filter(g => g.statut === 'en_cours');
    const gestationsTerminees = data.gestations.filter(g => g.statut === 'terminee');
    
    return `
4. ANALYSE DE REPRODUCTION
================================================================================

PERFORMANCE DE REPRODUCTION
--------------------------------------------------------------------------------
Gestations en cours: ${gestationsEnCours.length}
Gestations terminées: ${gestationsTerminees.length}
Total gestations: ${data.gestations.length}

DÉTAIL DES GESTATIONS EN COURS
--------------------------------------------------------------------------------
${gestationsEnCours.map(g => {
  const truie = data.porcs.find(p => p.id === g.truieId);
  return `• Truie ${truie?.numeroIdentification || 'N/A'} - ${g.nombrePorceletsPrevu} porcelets prévus - ${g.dateMiseBasPrevue.toLocaleDateString('fr-FR')}`;
}).join('\n')}

================================================================================
`;
  }

  /**
   * Génère la section nutrition
   */
  private static genererSectionNutrition(data: RapportPDFData, options: RapportPDFOptions): string {
    return `
5. ANALYSE NUTRITIONNELLE
================================================================================

CONSOMMATION ALIMENTAIRE
--------------------------------------------------------------------------------
Analyse des rations et consommation alimentaire par catégorie d'animaux.

RÉPARTITION PAR TYPE
--------------------------------------------------------------------------------
${this.analyserNutritionParType(data.porcs)}

RECOMMANDATIONS NUTRITIONNELLES
--------------------------------------------------------------------------------
${this.genererRecommandationsNutrition(data.porcs)}

================================================================================
`;
  }

  /**
   * Génère les annexes détaillées
   */
  private static genererAnnexes(data: RapportPDFData, options: RapportPDFOptions): string {
    return `
6. ANNEXES DÉTAILLÉES
================================================================================

LISTE COMPLÈTE DES PORCS
--------------------------------------------------------------------------------
${data.porcs.map(p => 
  `${p.numeroIdentification} | ${p.sexe} | ${p.race} | ${p.poidsActuel}kg | ${p.dateNaissance.toLocaleDateString('fr-FR')} | ${p.statut}`
).join('\n')}

LISTE DES TRANSACTIONS
--------------------------------------------------------------------------------
${data.transactions.map(t => 
  `${t.date.toLocaleDateString('fr-FR')} | ${t.type} | ${CalculsAgricoles.formaterMontant(t.montant, data.deviseConfig)} | ${t.description} | ${t.categorie || 'N/A'}`
).join('\n')}

LISTE DES GESTATIONS
--------------------------------------------------------------------------------
${data.gestations.map(g => {
  const truie = data.porcs.find(p => p.id === g.truieId);
  return `${g.dateMiseBasPrevue.toLocaleDateString('fr-FR')} | ${truie?.numeroIdentification || 'N/A'} | ${g.nombrePorceletsPrevu} porcelets | ${g.statut}`;
}).join('\n')}

================================================================================
`;
  }

  /**
   * Génère le pied de page
   */
  private static genererPiedDePage(data: RapportPDFData, options: RapportPDFOptions): string {
    const dateGeneration = new Date().toLocaleString('fr-FR');
    
    return `
================================================================================
                                FIN DU RAPPORT
================================================================================

Ce rapport a été généré automatiquement par FarmTrack le ${dateGeneration}.
Pour toute question concernant ce rapport, contactez ${data.utilisateurActuel.nom}.

Projet: ${data.projet.nom}
Période analysée: ${data.periode.debut.toLocaleDateString('fr-FR')} - ${data.periode.fin.toLocaleDateString('fr-FR')}

================================================================================
`;
  }

  /**
   * Fonctions utilitaires
   */
  private static formatDateForFileName(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  private static getTypeRapportLabel(type: string): string {
    const labels = {
      'complet': 'Rapport Complet',
      'finance': 'Rapport Financier',
      'production': 'Rapport de Production',
      'reproduction': 'Rapport de Reproduction',
      'nutrition': 'Rapport Nutritionnel',
    };
    return labels[type as keyof typeof labels] || 'Rapport';
  }

  private static analyserParRace(porcs: Porc[]): string {
    const races = porcs.reduce((acc, porc) => {
      acc[porc.race] = (acc[porc.race] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(races)
      .map(([race, count]) => `• ${race}: ${count} porcs`)
      .join('\n');
  }

  private static analyserParAge(porcs: Porc[]): string {
    const maintenant = new Date();
    const groupes = {
      '0-6 mois': 0,
      '6-12 mois': 0,
      '1-2 ans': 0,
      '2+ ans': 0,
    };

    porcs.forEach(porc => {
      const ageEnMois = (maintenant.getTime() - porc.dateNaissance.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (ageEnMois <= 6) groupes['0-6 mois']++;
      else if (ageEnMois <= 12) groupes['6-12 mois']++;
      else if (ageEnMois <= 24) groupes['1-2 ans']++;
      else groupes['2+ ans']++;
    });

    return Object.entries(groupes)
      .map(([groupe, count]) => `• ${groupe}: ${count} porcs`)
      .join('\n');
  }

  private static analyserNutritionParType(porcs: Porc[]): string {
    const types = porcs.reduce((acc, porc) => {
      acc[porc.statut] = (acc[porc.statut] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(types)
      .map(([type, count]) => `• ${type}: ${count} porcs`)
      .join('\n');
  }

  private static genererRecommandationsNutrition(porcs: Porc[]): string {
    return `• Vérifier les rations selon l'âge et le poids
• Adapter l'alimentation selon la saison
• Surveiller la consommation quotidienne
• Maintenir un équilibre nutritionnel optimal`;
  }

  /**
   * Partage le PDF généré
   */
  static async partagerPDF(filePath: string, titre: string): Promise<void> {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/pdf',
          dialogTitle: titre,
        });
      } else {
        console.warn('Le partage n\'est pas disponible sur cet appareil');
      }
    } catch (error) {
      console.error('Erreur lors du partage du PDF:', error);
      throw error;
    }
  }

  /**
   * Supprime le fichier PDF temporaire
   */
  static async nettoyerFichier(filePath: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error);
    }
  }
}
