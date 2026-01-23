/**
 * Service d'export et d'import de données
 * Permet d'exporter les données en JSON/CSV et d'importer depuis JSON
 */

// Note: Les packages expo-file-system et expo-sharing doivent être installés
// npm install expo-file-system expo-sharing
// Pour l'instant, on utilise require pour éviter les erreurs TypeScript
// L'utilisateur devra installer ces packages pour que l'export fonctionne
import { getErrorMessage } from '../types/common';
import apiClient from './api/apiClient';

export interface ExportData {
  version: string;
  date_export: string;
  projet: unknown;
  gestations: unknown[];
  sevrages: unknown[];
  charges_fixes: unknown[];
  depenses_ponctuelles: unknown[];
  ingredients: unknown[];
  rations: unknown[];
  mortalites: unknown[];
  planifications: unknown[];
  collaborateurs: unknown[];
  stocks_aliments: unknown[];
  stocks_mouvements: unknown[];
  production_animaux: unknown[];
  production_pesees: unknown[];
}

/**
 * Exporte toutes les données du projet actif en JSON
 */
export async function exportAllDataJSON(projetId: string): Promise<string> {
  try {
    // Récupérer toutes les données depuis l'API backend
    const projet = await apiClient.get<any>(`/projets/${projetId}`);
    const gestations = await apiClient.get<any[]>(`/reproduction/gestations`, {
      params: { projet_id: projetId },
    });
    const sevrages = await apiClient.get<any[]>(`/reproduction/sevrages`, {
      params: { projet_id: projetId },
    });
    const chargesFixes = await apiClient.get<any[]>(`/finance/charges-fixes`, {
      params: { projet_id: projetId },
    });
    const depensesPonctuelles = await apiClient.get<any[]>(`/finance/depenses-ponctuelles`, {
      params: { projet_id: projetId },
    });
    const mortalites = await apiClient.get<any[]>(`/mortalites`, {
      params: { projet_id: projetId },
    });
    const stocksAliments = await apiClient.get<any[]>(`/nutrition/stocks-aliments`, {
      params: { projet_id: projetId },
    });

    // Récupérer les mouvements de stock pour chaque aliment
    const stocksMouvements: unknown[] = [];
    for (const stock of stocksAliments) {
      const mouvements = await apiClient.get<any[]>(`/nutrition/stocks-aliments/${stock.id}/mouvements`, {
        params: { limit: 100 },
      });
      stocksMouvements.push(...mouvements);
    }

    const productionAnimaux = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: projetId, inclure_inactifs: false },
    });

    // Récupérer les pesées pour chaque animal
    const productionPesees: unknown[] = [];
    for (const animal of productionAnimaux) {
      const pesees = await apiClient.get<any[]>(`/production/pesees`, {
        params: { animal_id: animal.id },
      });
      productionPesees.push(...pesees);
    }

    // Récupérer les autres données
    const ingredients = await apiClient.get<any[]>(`/nutrition/ingredients`, {
      params: { projet_id: projetId },
    });
    const rations = await apiClient.get<any[]>(`/nutrition/rations`, {
      params: { projet_id: projetId },
    });
    const planifications = await apiClient.get<any[]>(`/planifications`, {
      params: { projet_id: projetId },
    });
    const collaborateurs = await apiClient.get<any[]>(`/collaborations`, {
      params: { projet_id: projetId },
    });

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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const FileSystem = require('expo-file-system');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sharing = require('expo-sharing');
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
    throw new Error(`Erreur lors de l'export et du partage : ${getErrorMessage(error)}`);
  }
}

/**
 * Exporte les données en CSV (format simplifié)
 */
export async function exportDataCSV(projetId: string, module?: string): Promise<string> {
  try {
    let csv = '';

    if (!module || module === 'gestations') {
      const gestations = await apiClient.get<any[]>(`/reproduction/gestations`, {
        params: { projet_id: projetId },
      });
      csv += 'Module: Gestations\n';
      csv += 'ID,Truie,Date Sautage,Date Mise Bas Prévue,Statut\n';
      gestations.forEach((g) => {
        csv += `${g.id},${g.truie_nom},${g.date_sautage},${g.date_mise_bas_prevue},${g.statut}\n`;
      });
      csv += '\n';
    }

    if (!module || module === 'mortalites') {
      const mortalites = await apiClient.get<any[]>(`/mortalites`, {
        params: { projet_id: projetId },
      });
      csv += 'Module: Mortalités\n';
      csv += 'ID,Date,Nombre Porcs,Cause,Catégorie\n';
      mortalites.forEach((m) => {
        csv += `${m.id},${m.date},${m.nombre_porcs},${m.cause},${m.categorie}\n`;
      });
      csv += '\n';
    }

    if (!module || module === 'finances') {
      const depenses = await apiClient.get<any[]>(`/finance/depenses-ponctuelles`, {
        params: { projet_id: projetId },
      });
      csv += 'Module: Dépenses\n';
      csv += 'ID,Date,Montant,Description\n';
      depenses.forEach((d) => {
        csv += `${d.id},${d.date},${d.montant},${d.commentaire || ''}\n`;
      });
      csv += '\n';
    }

    if (!module || module === 'production') {
      const animaux = await apiClient.get<any[]>(`/production/animaux`, {
        params: { projet_id: projetId, inclure_inactifs: false },
      });
      csv += 'Module: Production - Animaux\n';
      csv += 'ID,Code,Nom,Poids Initial\n';
      animaux.forEach((a) => {
        csv += `${a.id},${a.code},${a.nom || ''},${a.poids_initial || 0}\n`;
      });
      csv += '\n';
    }

    return csv;
  } catch (error: unknown) {
    throw new Error(`Erreur lors de l'export CSV : ${getErrorMessage(error)}`);
  }
}

/**
 * Exporte les données en CSV et partage
 */
export async function exportAndShareCSV(projetId: string, module?: string): Promise<void> {
  try {
    const csv = await exportDataCSV(projetId, module);
    const fileName = `fermier-pro-export-${module || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const FileSystem = require('expo-file-system');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sharing = require('expo-sharing');
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
    throw new Error(`Erreur lors de l'export CSV : ${getErrorMessage(error)}`);
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
      const projetTyped = data.projet as Record<string, unknown>;
      // Vérifier si le projet existe déjà via l'API backend
      try {
        const projetId = projetTyped.id && typeof projetTyped.id === 'string' ? projetTyped.id : '';
        if (!projetId) {
          throw new Error('ID du projet manquant dans les données');
        }
        const existingProjet = await apiClient.get<any>(`/projets/${projetId}`);
        if (existingProjet) {
          // Si existe, mettre à jour via l'API backend
          await apiClient.patch(`/projets/${projetId}`, {
            nom: projetTyped.nom && typeof projetTyped.nom === 'string' ? projetTyped.nom : undefined,
            localisation:
              projetTyped.localisation && typeof projetTyped.localisation === 'string'
                ? projetTyped.localisation
                : undefined,
            nombre_truies:
              projetTyped.nombre_truies && typeof projetTyped.nombre_truies === 'number'
                ? projetTyped.nombre_truies
                : undefined,
            nombre_verrats:
              projetTyped.nombre_verrats && typeof projetTyped.nombre_verrats === 'number'
                ? projetTyped.nombre_verrats
                : undefined,
            nombre_porcelets:
              projetTyped.nombre_porcelets && typeof projetTyped.nombre_porcelets === 'number'
                ? projetTyped.nombre_porcelets
                : undefined,
            poids_moyen_actuel:
              projetTyped.poids_moyen_actuel && typeof projetTyped.poids_moyen_actuel === 'number'
                ? projetTyped.poids_moyen_actuel
                : undefined,
            age_moyen_actuel:
              projetTyped.age_moyen_actuel && typeof projetTyped.age_moyen_actuel === 'number'
                ? projetTyped.age_moyen_actuel
                : undefined,
            notes:
              projetTyped.notes && typeof projetTyped.notes === 'string' ? projetTyped.notes : undefined,
          });
        }
      } catch {
        // Si n'existe pas, créer via l'API backend
        // Note: createProjet nécessite proprietaire_id, mais on ne l'a pas dans les données exportées
        // Pour l'instant, on utilise 'user_1' par défaut
        // Une version améliorée pourrait demander à l'utilisateur de sélectionner un propriétaire
        await apiClient.post('/projets', {
          nom: projetTyped.nom && typeof projetTyped.nom === 'string' ? projetTyped.nom : undefined,
          localisation:
            projetTyped.localisation && typeof projetTyped.localisation === 'string'
              ? projetTyped.localisation
              : undefined,
          nombre_truies:
            projetTyped.nombre_truies && typeof projetTyped.nombre_truies === 'number'
              ? projetTyped.nombre_truies
              : undefined,
          nombre_verrats:
            projetTyped.nombre_verrats && typeof projetTyped.nombre_verrats === 'number'
              ? projetTyped.nombre_verrats
              : undefined,
          nombre_porcelets:
            projetTyped.nombre_porcelets && typeof projetTyped.nombre_porcelets === 'number'
              ? projetTyped.nombre_porcelets
              : undefined,
          poids_moyen_actuel:
            projetTyped.poids_moyen_actuel && typeof projetTyped.poids_moyen_actuel === 'number'
              ? projetTyped.poids_moyen_actuel
              : undefined,
          age_moyen_actuel:
            projetTyped.age_moyen_actuel && typeof projetTyped.age_moyen_actuel === 'number'
              ? projetTyped.age_moyen_actuel
              : undefined,
          notes:
            projetTyped.notes && typeof projetTyped.notes === 'string' ? projetTyped.notes : undefined,
          statut:
            (projetTyped.statut && typeof projetTyped.statut === 'string' ? projetTyped.statut : undefined) ||
            'actif',
          proprietaire_id:
            (projetTyped.proprietaire_id && typeof projetTyped.proprietaire_id === 'string'
              ? projetTyped.proprietaire_id
              : undefined) || 'user_1',
        });
      }
    }

    // Importer les autres données
    // Note: Pour simplifier, on importe sans vérifier les doublons
    // Une version améliorée pourrait proposer de fusionner ou remplacer

    if (data.gestations && Array.isArray(data.gestations)) {
      const projetTyped = data.projet as Record<string, unknown> | undefined;
      for (const gestation of data.gestations) {
        const gestationTyped = gestation as Record<string, unknown>;
        try {
          await apiClient.post('/reproduction/gestations', {
            projet_id:
              (gestationTyped.projet_id && typeof gestationTyped.projet_id === 'string'
                ? gestationTyped.projet_id
                : undefined) ||
              (projetTyped?.id && typeof projetTyped.id === 'string' ? projetTyped.id : undefined) ||
              '',
            truie_id:
              gestationTyped.truie_id && typeof gestationTyped.truie_id === 'string'
                ? gestationTyped.truie_id
                : undefined,
            truie_nom:
              gestationTyped.truie_nom && typeof gestationTyped.truie_nom === 'string'
                ? gestationTyped.truie_nom
                : undefined,
            verrat_id:
              gestationTyped.verrat_id && typeof gestationTyped.verrat_id === 'string'
                ? gestationTyped.verrat_id
                : undefined,
            verrat_nom:
              gestationTyped.verrat_nom && typeof gestationTyped.verrat_nom === 'string'
                ? gestationTyped.verrat_nom
                : undefined,
            date_sautage:
              gestationTyped.date_sautage && typeof gestationTyped.date_sautage === 'string'
                ? gestationTyped.date_sautage
                : undefined,
            nombre_porcelets_prevu:
              gestationTyped.nombre_porcelets_prevu &&
              typeof gestationTyped.nombre_porcelets_prevu === 'number'
                ? gestationTyped.nombre_porcelets_prevu
                : undefined,
            notes:
              gestationTyped.notes && typeof gestationTyped.notes === 'string'
                ? gestationTyped.notes
                : undefined,
            statut:
              (gestationTyped.statut && typeof gestationTyped.statut === 'string'
                ? gestationTyped.statut
                : undefined) || 'en_cours',
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
    throw new Error(`Erreur lors de l'import : ${getErrorMessage(error)}`);
  }
}

/**
 * Lit un fichier JSON depuis l'URI
 */
export async function readJSONFile(uri: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const FileSystem = require('expo-file-system');
    const content = await FileSystem.readAsStringAsync(uri);
    return content;
  } catch (error: unknown) {
    throw new Error(`Erreur lors de la lecture du fichier : ${getErrorMessage(error)}`);
  }
}
