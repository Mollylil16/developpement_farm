/**
 * Hook pour gérer les filtres et la recherche du cheptel
 */

import { useState, useMemo } from 'react';
import { useAppSelector } from '../../store/hooks';
import { selectAllAnimaux } from '../../store/selectors/productionSelectors';
import { ProductionAnimal, StatutAnimal } from '../../types';
import { getCategorieAnimal } from '../../utils/animalUtils';

const STATUTS_CHEPTEL: StatutAnimal[] = ['actif', 'autre'];

export function useProductionCheptelFilters(projetId?: string) {
  const [filterCategorie, setFilterCategorie] = useState<'tous' | 'truie' | 'verrat' | 'porcelet'>('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const allAnimaux = useAppSelector(selectAllAnimaux);

  // Filtrer les animaux du cheptel (actif et autre) avec les filtres appliqués
  const animauxFiltres = useMemo(() => {
    if (!Array.isArray(allAnimaux)) return [];

    // D'abord filtrer par statut (cheptel uniquement)
    let result = allAnimaux.filter(
      (a) => a.projet_id === projetId && STATUTS_CHEPTEL.includes(a.statut)
    );

    // Filtrer par catégorie si spécifié
    if (filterCategorie !== 'tous') {
      result = result.filter((a) => getCategorieAnimal(a) === filterCategorie);
    }

    // Filtrer par recherche (code ou nom) si spécifié
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((a) => {
        const codeMatch = a.code?.toLowerCase().includes(query) || false;
        const nomMatch = a.nom?.toLowerCase().includes(query) || false;
        return codeMatch || nomMatch;
      });
    }

    return result;
  }, [allAnimaux, projetId, filterCategorie, searchQuery]);

  // Compter par catégorie pour les animaux du cheptel
  const countByCategory = useMemo(() => {
    if (!Array.isArray(allAnimaux)) return { truies: 0, verrats: 0, porcelets: 0 };

    const animauxCheptel = allAnimaux.filter(
      (a) => a.projet_id === projetId && STATUTS_CHEPTEL.includes(a.statut)
    );

    return {
      truies: animauxCheptel.filter((a) => getCategorieAnimal(a) === 'truie').length,
      verrats: animauxCheptel.filter((a) => getCategorieAnimal(a) === 'verrat').length,
      porcelets: animauxCheptel.filter((a) => getCategorieAnimal(a) === 'porcelet').length,
    };
  }, [allAnimaux, projetId]);

  return {
    filterCategorie,
    setFilterCategorie,
    searchQuery,
    setSearchQuery,
    animauxFiltres,
    countByCategory,
  };
}

