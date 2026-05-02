/**
 * Hook custom pour centraliser la logique de filtrage des animaux actifs
 * Évite la duplication de code et garantit la cohérence
 */

import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectAllAnimaux } from '../store/selectors/productionSelectors';
import type { ProductionAnimal } from '../types/production';
import { filterActiveAnimals, getCategorieAnimal } from '../utils/animalUtils';

interface UseAnimauxActifsOptions {
  projetId?: string;
  categorie?: 'tous' | 'truie' | 'verrat' | 'porcelet';
  searchQuery?: string;
}

interface UseAnimauxActifsReturn {
  animauxActifs: ProductionAnimal[];
  animauxProjet: ProductionAnimal[];
  countByCategory: {
    truies: number;
    verrats: number;
    porcelets: number;
  };
}

/**
 * Hook pour obtenir les animaux actifs avec filtrage optionnel
 * @param options Options de filtrage (projetId, categorie, searchQuery)
 * @returns Objet contenant les animaux filtrés et les statistiques
 */
export function useAnimauxActifs(options: UseAnimauxActifsOptions = {}): UseAnimauxActifsReturn {
  const { projetId, categorie = 'tous', searchQuery = '' } = options;
  const animaux = useAppSelector(selectAllAnimaux);

  // Filtrer les animaux du projet si projetId est fourni
  const animauxProjet = useMemo(() => {
    if (!projetId) {
      return animaux;
    }
    return animaux.filter((animal) => animal.projet_id === projetId);
  }, [animaux, projetId]);

  // Filtrer les animaux actifs
  const animauxActifs = useMemo(() => {
    let result = filterActiveAnimals(animauxProjet, projetId);

    // Filtrer par catégorie si spécifié
    if (categorie !== 'tous') {
      result = result.filter((a) => getCategorieAnimal(a) === categorie);
    }

    // Filtrer par recherche (code ou nom) si spécifié
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((a) => {
        const codeMatch = a.code.toLowerCase().includes(query);
        const nomMatch = a.nom?.toLowerCase().includes(query) || false;
        return codeMatch || nomMatch;
      });
    }

    return result;
  }, [animauxProjet, projetId, categorie, searchQuery]);

  // Compter par catégorie
  const countByCategory = useMemo(() => {
    const truies = animauxActifs.filter((a) => getCategorieAnimal(a) === 'truie').length;
    const verrats = animauxActifs.filter((a) => getCategorieAnimal(a) === 'verrat').length;
    const porcelets = animauxActifs.filter((a) => getCategorieAnimal(a) === 'porcelet').length;

    return { truies, verrats, porcelets };
  }, [animauxActifs]);

  return {
    animauxActifs,
    animauxProjet,
    countByCategory,
  };
}
