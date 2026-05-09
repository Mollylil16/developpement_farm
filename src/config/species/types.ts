/**
 * Multi-species architecture for FarmTrack Pro.
 * Each species defines its biological parameters, KPI names, and growth model.
 * Add new species by creating a profile and registering it in index.ts.
 */

export type GrowthModelType = 'sigmoid' | 'gompertz' | 'linear';

export type SpeciesCode = 'porc' | 'poulet' | 'lapin' | 'poisson';

/**
 * Sigmoid (logistic) growth model parameters: W(t) = Wmax / (1 + exp(-k * (t - t0)))
 */
export interface SigmoidGrowthParams {
  model: 'sigmoid';
  Wmax: number;   // asymptotic weight (kg)
  k: number;      // growth rate constant (day^-1)
  t0: number;     // inflection point — age of maximum daily gain (days)
}

/**
 * Gompertz growth model parameters: W(t) = A * exp(-B * exp(-k * t))
 */
export interface GompertzGrowthParams {
  model: 'gompertz';
  A: number;      // asymptotic weight (kg)
  B: number;      // displacement constant
  k: number;      // growth rate constant (day^-1)
}

/**
 * Simple linear fallback: W(t) = rate * t, capped at maxWeight
 */
export interface LinearGrowthParams {
  model: 'linear';
  rateKgPerDay: number;
  maxWeight: number;
}

export type GrowthParams = SigmoidGrowthParams | GompertzGrowthParams | LinearGrowthParams;

/**
 * Breed-specific growth curve override.
 */
export interface BreedGrowthOverride {
  growthParams: GrowthParams;
  targetSlaughterWeight: number;
}

/**
 * Core species profile: all biological and economic constants for a species.
 */
export interface SpeciesProfile {
  code: SpeciesCode;
  name: string;                        // display name (e.g. "Porc")

  // Reproduction
  gestationDays: number;               // average gestation duration
  optimalWeaningDays: number;          // recommended weaning age
  serviceIntervalDays: number;         // days from weaning to next successful mating
  litterSizeAvg: number;               // average piglets/kits/chicks born alive per litter
  conceptionRatePct: number;           // expected conception rate (0–100)

  // Growth
  defaultGrowthParams: GrowthParams;   // default growth curve
  breedOverrides: Record<string, BreedGrowthOverride>; // breed-specific overrides
  targetSlaughterWeight: number;       // default target weight (kg)

  // Feed
  typicalFCR: number;                  // typical feed conversion ratio (kg feed / kg gain)
  avgDailyGainKg: number;              // typical ADG in growing phase (kg/day)

  // Carcass / valuation
  dressingPercentagePct: number;       // live weight → carcass weight (0–100)

  // KPI label (species-specific productivity index)
  productivityKPILabel: string;        // e.g. "PSY", "Poussins/Poule/An"
  productivityKPIDescription: string;
}
