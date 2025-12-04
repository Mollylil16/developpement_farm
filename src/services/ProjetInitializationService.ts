/**
 * Service pour initialiser un projet avec ses animaux initiaux
 * 
 * Responsabilités:
 * - Créer les animaux initiaux lors de la création d'un projet
 * - Générer des codes uniques pour les animaux
 * - Générer des noms uniques par genre
 */

import * as SQLite from 'expo-sqlite';
import { AnimalRepository } from '../database/repositories/AnimalRepository';
import { genererPlusieursNomsAleatoires } from '../utils/nameGenerator';

export class ProjetInitializationService {
  private db: SQLite.SQLiteDatabase;

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Crée automatiquement les animaux initiaux lors de la création d'un projet
   */
  async createAnimauxInitials(
    projetId: string,
    effectifs: { nombre_truies: number; nombre_verrats: number; nombre_porcelets: number }
  ): Promise<void> {
    const animalRepo = new AnimalRepository(this.db);

    // Récupérer les codes existants pour éviter les doublons
    const animauxExistants = await animalRepo.findByProjet(projetId);
    const codesExistants = new Set(animauxExistants.map((a) => a.code.toUpperCase()));

    // Récupérer les noms déjà utilisés pour générer des noms uniques
    const nomsDejaUtilises = animauxExistants
      .map((a) => a.nom)
      .filter((nom): nom is string => nom !== undefined && nom !== null && nom !== '');

    // Fonction helper pour générer un code unique
    const generateUniqueCode = (prefix: string, count: number): string => {
      let num = count;
      let code = `${prefix}${String(num).padStart(3, '0')}`;

      // Si le code existe déjà, incrémenter jusqu'à trouver un code libre
      while (codesExistants.has(code.toUpperCase())) {
        num++;
        code = `${prefix}${String(num).padStart(3, '0')}`;
      }

      codesExistants.add(code.toUpperCase());
      return code;
    };

    let truieCount = 0;
    let verratCount = 0;
    let porceletCount = 0;

    // Compter les animaux existants par type pour la numérotation
    animauxExistants.forEach((animal) => {
      const codeUpper = animal.code.toUpperCase();
      if (codeUpper.startsWith('T')) {
        const num = parseInt(codeUpper.substring(1));
        if (!isNaN(num) && num > truieCount) truieCount = num;
      } else if (codeUpper.startsWith('V')) {
        const num = parseInt(codeUpper.substring(1));
        if (!isNaN(num) && num > verratCount) verratCount = num;
      } else if (codeUpper.startsWith('P')) {
        const num = parseInt(codeUpper.substring(1));
        if (!isNaN(num) && num > porceletCount) porceletCount = num;
      }
    });

    // Générer des noms uniques séparément par genre pour éviter les noms féminins aux verrats
    const nomsFeminins = genererPlusieursNomsAleatoires(
      effectifs.nombre_truies,
      nomsDejaUtilises,
      'tous',
      'femelle'
    );
    const nomsMasculins = genererPlusieursNomsAleatoires(
      effectifs.nombre_verrats,
      [...nomsDejaUtilises, ...nomsFeminins], // Éviter les doublons avec les truies
      'tous',
      'male'
    );
    const nomsPorcelets = genererPlusieursNomsAleatoires(
      effectifs.nombre_porcelets,
      [...nomsDejaUtilises, ...nomsFeminins, ...nomsMasculins], // Éviter les doublons
      'tous',
      'indetermine'
    );

    let nomFemininIndex = 0;
    let nomMasculinIndex = 0;
    let nomPorceletIndex = 0;

    // Créer les truies
    for (let i = 0; i < effectifs.nombre_truies; i++) {
      truieCount++;
      const code = generateUniqueCode('T', truieCount);
      const nom = nomsFeminins[nomFemininIndex++];

      await animalRepo.create({
        projet_id: projetId,
        code,
        nom,
        sexe: 'femelle',
        reproducteur: true,
        statut: 'actif',
        date_naissance: undefined,
        poids_initial: undefined,
        date_entree: undefined,
        race: undefined,
        origine: undefined,
        notes: "Créé lors de l'initialisation du projet",
        pere_id: null,
        mere_id: null,
      });
    }

    // Créer les verrats
    for (let i = 0; i < effectifs.nombre_verrats; i++) {
      verratCount++;
      const code = generateUniqueCode('V', verratCount);
      const nom = nomsMasculins[nomMasculinIndex++];

      await animalRepo.create({
        projet_id: projetId,
        code,
        nom,
        sexe: 'male',
        reproducteur: true,
        statut: 'actif',
        date_naissance: undefined,
        poids_initial: undefined,
        date_entree: undefined,
        race: undefined,
        origine: undefined,
        notes: "Créé lors de l'initialisation du projet",
        pere_id: null,
        mere_id: null,
      });
    }

    // Créer les porcelets
    for (let i = 0; i < effectifs.nombre_porcelets; i++) {
      porceletCount++;
      const code = generateUniqueCode('P', porceletCount);
      const nom = nomsPorcelets[nomPorceletIndex++];

      await animalRepo.create({
        projet_id: projetId,
        code,
        nom,
        sexe: 'indetermine',
        reproducteur: false,
        statut: 'actif',
        date_naissance: undefined,
        poids_initial: undefined,
        date_entree: undefined,
        race: undefined,
        origine: undefined,
        notes: "Créé lors de l'initialisation du projet",
        pere_id: null,
        mere_id: null,
      });
    }
  }
}

