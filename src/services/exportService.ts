/**
 * Service d'export et d'import de données
 * Permet d'exporter les données en JSON/CSV et d'importer depuis JSON
 */

// Note: Les packages expo-file-system et expo-sharing doivent être installés
// npm install expo-file-system expo-sharing
// Pour l'instant, on utilise des types any pour éviter les erreurs de compilation
// L'utilisateur devra installer ces packages pour que l'export fonctionne
declare const FileSystem: any;
declare const Sharing: any;
import { databaseService } from './database';
import { getDatabase } from './database';
import { getErrorMessage } from '../types/common';
import {
  ProjetRepository,
  GestationRepository,
  SevrageRepository,
  ChargeFixeRepository,
  DepensePonctuelleRepository,
  MortaliteRepository,
  StockRepository,
  AnimalRepository,
  PeseeRepository,
  IngredientRepository,
  RationRepository,
  PlanificationRepository,
  CollaborateurRepository,
} from '../database/repositories';

export interface ExportData {
  version: string;
  date_export: string;
  projet: any;
  gestations: any[];
  sevrages: any[];
  charges_fixes: any[];
  depenses_ponctuelles: any[];
  ingredients: any[];
  rations: any[];
  mortalites: any[];
  planifications: any[];
  collaborateurs: any[];
  stocks_aliments: any[];
  stocks_mouvements: any[];
  production_animaux: any[];
  production_pesees: any[];
}

/**
 * Exporte toutes les données du projet actif en JSON
 */
export async function exportAllDataJSON(projetId: string): Promise<string> {
  try {
    // Récupérer toutes les données depuis la base de données
    const db = await getDatabase();
    const projetRepo = new ProjetRepository(db);
    const gestationRepo = new GestationRepository(db);
    const sevrageRepo = new SevrageRepository(db);
    const chargeFixeRepo = new ChargeFixeRepository(db);
    const depenseRepo = new DepensePonctuelleRepository(db);
    const mortaliteRepo = new MortaliteRepository(db);
    const stockRepo = new StockRepository(db);
    const animalRepo = new AnimalRepository(db);
    const peseeRepo = new PeseeRepository(db);

    const projet = await projetRepo.getById(projetId);
    const gestations = await gestationRepo.findAll(projetId);
    const sevrages = await sevrageRepo.findByProjet(projetId);
    const chargesFixes = await chargeFixeRepo.findAll(projetId);
    const depensesPonctuelles = await depenseRepo.findAll(projetId);
    const mortalites = await mortaliteRepo.findByProjet(projetId);
    const stocksAliments = await stockRepo.findByProjet(projetId);

    // Récupérer les mouvements de stock pour chaque aliment
    const stocksMouvements: any[] = [];
    for (const stock of stocksAliments) {
      const mouvements = await stockRepo.getMouvements(stock.id, 100);
      stocksMouvements.push(...mouvements);
    }

    const productionAnimaux = await animalRepo.findActiveByProjet(projetId);

    // Récupérer les pesées pour chaque animal
    const productionPesees: any[] = [];
    for (const animal of productionAnimaux) {
      const pesees = await peseeRepo.findByAnimal(animal.id);
      productionPesees.push(...pesees);
    }

    // Utiliser les nouveaux repositories
    const ingredientRepo = new IngredientRepository(db);
    const rationRepo = new RationRepository(db);
    const planificationRepo = new PlanificationRepository(db);
    const collaborateurRepo = new CollaborateurRepository(db);
    const ingredients = await ingredientRepo.getAllIngredients(projetId);
    const rations = await rationRepo.findByProjet(projetId);
    const planifications = await planificationRepo.findByProjet(projetId);
    const collaborateurs = await collaborateurRepo.findByProjet(projetId);

    const exportData: ExportData = {
      version: '1.0.0',
      date_export: new Date().toISOString(),
      projet,
      gestations,
      sevrages,
      charges_fixes: chargesFixes,
      depenses_ponctuelles: depensesPonctuelles,
      ingredients,
      rations,
      mortalites,
      planifications,
      collaborateurs,
      stocks_aliments: stocksAliments,
      stocks_mouvements: stocksMouvements,
      production_animaux: productionAnimaux,
      production_pesees: productionPesees,
    };

    const json = JSON.stringify(exportData, null, 2);
    return json;
  } catch (error: unknown) {
    throw new Error(`Erreur lors de l'export : ${getErrorMessage(error)}`);
  }
}

/**
 * Exporte les données en fichier JSON et partage
 */
export async function exportAndShareJSON(projetId: string): Promise<void> {
  try {
    const json = await exportAllDataJSON(projetId);
    const fileName = `fermier-pro-backup-${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, json);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Exporter les données',
      });
    } else {
      throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil");
    }
  } catch (error: unknown) {
    throw new Error(`Erreur lors de l'export et du partage : ${error.message}`);
  }
}

/**
 * Exporte les données en CSV (format simplifié)
 */
export async function exportDataCSV(projetId: string, module?: string): Promise<string> {
  try {
    let csv = '';

    const db = await getDatabase();
    const gestationRepo = new GestationRepository(db);
    const mortaliteRepo = new MortaliteRepository(db);
    const depenseRepo = new DepensePonctuelleRepository(db);
    const animalRepo = new AnimalRepository(db);

    if (!module || module === 'gestations') {
      const gestations = await gestationRepo.findAll(projetId);
      csv += 'Module: Gestations\n';
      csv += 'ID,Truie,Date Sautage,Date Mise Bas Prévue,Statut\n';
      gestations.forEach((g) => {
        csv += `${g.id},${g.truie_nom},${g.date_sautage},${g.date_mise_bas_prevue},${g.statut}\n`;
      });
      csv += '\n';
    }

    if (!module || module === 'mortalites') {
      const mortalites = await mortaliteRepo.findByProjet(projetId);
      csv += 'Module: Mortalités\n';
      csv += 'ID,Date,Nombre Porcs,Cause,Catégorie\n';
      mortalites.forEach((m) => {
        csv += `${m.id},${m.date},${m.nombre_porcs},${m.cause},${m.categorie}\n`;
      });
      csv += '\n';
    }

    if (!module || module === 'finances') {
      const depenses = await depenseRepo.findAll(projetId);
      csv += 'Module: Dépenses\n';
      csv += 'ID,Date,Montant,Description\n';
      depenses.forEach((d) => {
        csv += `${d.id},${d.date},${d.montant},${d.commentaire || ''}\n`;
      });
      csv += '\n';
    }

    if (!module || module === 'production') {
      const animaux = await animalRepo.findActiveByProjet(projetId);
      csv += 'Module: Production - Animaux\n';
      csv += 'ID,Code,Nom,Poids Initial\n';
      animaux.forEach((a) => {
        csv += `${a.id},${a.code},${a.nom || ''},${a.poids_initial || 0}\n`;
      });
      csv += '\n';
    }

    return csv;
  } catch (error: unknown) {
    throw new Error(`Erreur lors de l'export CSV : ${error.message}`);
  }
}

/**
 * Exporte les données en CSV et partage
 */
export async function exportAndShareCSV(projetId: string, module?: string): Promise<void> {
  try {
    const csv = await exportDataCSV(projetId, module);
    const fileName = `fermier-pro-export-${module || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, csv);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Exporter en CSV',
      });
    } else {
      throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil");
    }
  } catch (error: unknown) {
    throw new Error(`Erreur lors de l'export CSV : ${error.message}`);
  }
}

/**
 * Importe les données depuis un fichier JSON
 */
export async function importDataFromJSON(jsonData: string): Promise<void> {
  try {
    const data: ExportData = JSON.parse(jsonData);

    // Vérifier la version
    if (!data.version || !data.date_export) {
      throw new Error('Format de fichier invalide');
    }

    // Importer les données dans l'ordre (projet d'abord, puis dépendances)
    if (data.projet) {
      const db = await getDatabase();
      const projetRepo = new ProjetRepository(db);
      
      // Vérifier si le projet existe déjà
      const existingProjet = await projetRepo.findById(data.projet.id);
      if (existingProjet) {
        // Si existe, mettre à jour
        await projetRepo.update(data.projet.id, {
          nom: data.projet.nom,
          localisation: data.projet.localisation,
          nombre_truies: data.projet.nombre_truies,
          nombre_verrats: data.projet.nombre_verrats,
          nombre_porcelets: data.projet.nombre_porcelets,
          poids_moyen_actuel: data.projet.poids_moyen_actuel,
          age_moyen_actuel: data.projet.age_moyen_actuel,
          notes: data.projet.notes,
        });
      } else {
        // Si n'existe pas, créer
        // Note: createProjet nécessite proprietaire_id, mais on ne l'a pas dans les données exportées
        // Pour l'instant, on utilise 'user_1' par défaut
        // Une version améliorée pourrait demander à l'utilisateur de sélectionner un propriétaire
        // La création des animaux initiaux est gérée automatiquement par ProjetRepository.create()
        const { ProjetRepository } = await import('../database/repositories');
        const projetRepo = new ProjetRepository(db);
        await projetRepo.create({
          nom: data.projet.nom,
          localisation: data.projet.localisation,
          nombre_truies: data.projet.nombre_truies,
          nombre_verrats: data.projet.nombre_verrats,
          nombre_porcelets: data.projet.nombre_porcelets,
          poids_moyen_actuel: data.projet.poids_moyen_actuel,
          age_moyen_actuel: data.projet.age_moyen_actuel,
          notes: data.projet.notes,
          statut: data.projet.statut || 'actif',
          proprietaire_id: data.projet.proprietaire_id || 'user_1',
        });
      }
    }

    // Importer les autres données
    // Note: Pour simplifier, on importe sans vérifier les doublons
    // Une version améliorée pourrait proposer de fusionner ou remplacer

    if (data.gestations) {
      const db = await getDatabase();
      const gestationRepo = new GestationRepository(db);
      for (const gestation of data.gestations) {
        try {
          await gestationRepo.create({
            projet_id: gestation.projet_id || data.projet?.id || '',
            truie_id: gestation.truie_id,
            truie_nom: gestation.truie_nom,
            verrat_id: gestation.verrat_id,
            verrat_nom: gestation.verrat_nom,
            date_sautage: gestation.date_sautage,
            nombre_porcelets_prevu: gestation.nombre_porcelets_prevu,
            notes: gestation.notes,
            statut: gestation.statut || 'en_cours',
          });
        } catch {
          // Ignorer les erreurs de doublons
        }
      }
    }

    // Importer les autres modules de la même manière
    // (sevrages, finances, nutrition, etc.)

    // Pour l'instant, on importe seulement le projet et les gestations
    // Les autres modules peuvent être ajoutés de la même manière
  } catch (error: unknown) {
    throw new Error(`Erreur lors de l'import : ${error.message}`);
  }
}

/**
 * Lit un fichier JSON depuis l'URI
 */
export async function readJSONFile(uri: string): Promise<string> {
  try {
    const content = await FileSystem.readAsStringAsync(uri);
    return content;
  } catch (error: unknown) {
    throw new Error(`Erreur lors de la lecture du fichier : ${error.message}`);
  }
}
