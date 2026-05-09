import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import type { Porc } from '../../types';

const selectPorcsState = (state: RootState) => state.porcs;

export const selectAllPorcs = createSelector(
  [selectPorcsState],
  (porcsState) => porcsState.porcs
);

export const selectPorcsLoading = createSelector(
  [selectPorcsState],
  (porcsState) => porcsState.loading
);

export const selectPorcsError = createSelector(
  [selectPorcsState],
  (porcsState) => porcsState.error
);

export const selectPorcsActifs = createSelector(
  [selectAllPorcs],
  (porcs) => porcs.filter((p: Porc) => (p.statut as any) === 'actif')
);

export const selectPorcById = createSelector(
  [selectAllPorcs, (_: RootState, id: string) => id],
  (porcs, id) => porcs.find((p: Porc) => p.id === id)
);

export const selectPorcsCount = createSelector(
  [selectAllPorcs],
  (porcs) => porcs.length
);
