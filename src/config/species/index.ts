import { SpeciesCode, SpeciesProfile } from './types';
import { PORC_PROFILE } from './porc';

export type { SpeciesCode, SpeciesProfile } from './types';
export { PORC_PROFILE } from './porc';

const SPECIES_REGISTRY: Partial<Record<SpeciesCode, SpeciesProfile>> = {
  porc: PORC_PROFILE,
  // Future species — uncomment when implemented:
  // poulet: POULET_PROFILE,
  // lapin: LAPIN_PROFILE,
  // poisson: POISSON_PROFILE,
};

export function getSpeciesProfile(code: SpeciesCode): SpeciesProfile {
  const profile = SPECIES_REGISTRY[code];
  if (!profile) {
    throw new Error(`Espèce inconnue: ${code}. Espèces supportées: ${Object.keys(SPECIES_REGISTRY).join(', ')}`);
  }
  return profile;
}

export function listSupportedSpecies(): SpeciesCode[] {
  return Object.keys(SPECIES_REGISTRY) as SpeciesCode[];
}
