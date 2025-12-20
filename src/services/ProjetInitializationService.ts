/**
 * Service pour initialiser un projet avec ses animaux initiaux
 *
 * Responsabilités:
 * - Créer les animaux initiaux lors de la création d'un projet
 * - Générer des codes uniques pour les animaux
 * - Générer des noms uniques par genre
 */

import apiClient from './api/apiClient';
import { genererPlusieursNomsAleatoires } from '../utils/nameGenerator';

export class ProjetInitializationService {
  /**
   * Crée automatiquement les animaux initiaux lors de la création d'un projet
   */
  async createAnimauxInitials(
    projetId: string,
    effectifs: {
      nombre_truies: number;
      nombre_verrats: number;
      nombre_porcelets: number;
      nombre_croissance?: number;
    }
  ): Promise<void> {
    // Récupérer les codes existants pour éviter les doublons depuis l'API backend
    const animauxExistants = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: projetId },
    });
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
    let croissanceCount = 0;

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
      } else if (codeUpper.startsWith('C')) {
        const num = parseInt(codeUpper.substring(1));
        if (!isNaN(num) && num > croissanceCount) croissanceCount = num;
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
    const nomsCroissance = genererPlusieursNomsAleatoires(
      effectifs.nombre_croissance || 0,
      [...nomsDejaUtilises, ...nomsFeminins, ...nomsMasculins, ...nomsPorcelets], // Éviter les doublons
      'tous',
      'indetermine'
    );

    let nomFemininIndex = 0;
    let nomMasculinIndex = 0;
    let nomPorceletIndex = 0;
    let nomCroissanceIndex = 0;

    // Créer les truies
    for (let i = 0; i < effectifs.nombre_truies; i++) {
      truieCount++;
      const code = generateUniqueCode('T', truieCount);
      const nom = nomsFeminins[nomFemininIndex++];

      await apiClient.post('/production/animaux', {
        projet_id: projetId,
        code,
        nom,
        sexe: 'femelle',
        reproducteur: true,
        statut: 'actif',
        notes: "Créé lors de l'initialisation du projet",
      });
    }

    // Créer les verrats
    for (let i = 0; i < effectifs.nombre_verrats; i++) {
      verratCount++;
      const code = generateUniqueCode('V', verratCount);
      const nom = nomsMasculins[nomMasculinIndex++];

      await apiClient.post('/production/animaux', {
        projet_id: projetId,
        code,
        nom,
        sexe: 'male',
        reproducteur: true,
        statut: 'actif',
        notes: "Créé lors de l'initialisation du projet",
      });
    }

    // Créer les porcelets
    for (let i = 0; i < effectifs.nombre_porcelets; i++) {
      porceletCount++;
      const code = generateUniqueCode('P', porceletCount);
      const nom = nomsPorcelets[nomPorceletIndex++];

      await apiClient.post('/production/animaux', {
        projet_id: projetId,
        code,
        nom,
        sexe: 'indetermine',
        reproducteur: false,
        statut: 'actif',
        categorie_poids: 'porcelet',
        notes: "Créé lors de l'initialisation du projet",
      });
    }

    // Créer les porcs en croissance
    for (let i = 0; i < (effectifs.nombre_croissance || 0); i++) {
      croissanceCount++;
      const code = generateUniqueCode('C', croissanceCount);
      const nom = nomsCroissance[nomCroissanceIndex++];

      await apiClient.post('/production/animaux', {
        projet_id: projetId,
        code,
        nom,
        sexe: 'indetermine',
        reproducteur: false,
        statut: 'actif',
        categorie_poids: 'croissance',
        notes: "Créé lors de l'initialisation du projet",
      });
    }
  }
}
