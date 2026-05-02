import { SpeciesProfile } from './types';

/**
 * Pig species profile.
 *
 * Growth curves use the sigmoid (logistic) model: W(t) = Wmax / (1 + exp(-k * (t - t0)))
 *
 * Standard commercial pig calibration:
 *   W(0)   ≈ 1.5 kg  (birth)
 *   W(28)  ≈ 8 kg    (weaning)
 *   W(90)  ≈ 35 kg   (grower start, inflection zone)
 *   W(180) ≈ 110 kg  (finisher / slaughter)
 *
 * Interval between farrowings (IBF) for PSY:
 *   IBF = gestation (114) + lactation/weaning (28) + service interval (7) = 149 days
 *   Farrowings/year = 365 / 149 ≈ 2.45
 */
export const PORC_PROFILE: SpeciesProfile = {
  code: 'porc',
  name: 'Porc',

  // Reproduction
  gestationDays: 114,
  optimalWeaningDays: 28,
  serviceIntervalDays: 7,
  litterSizeAvg: 11,
  conceptionRatePct: 85,

  // Growth — sigmoid model for standard commercial pig
  defaultGrowthParams: {
    model: 'sigmoid',
    // W(t) = 130 / (1 + exp(-0.0495 * (t - 90)))
    // Calibrated so W(180) ≈ 128 kg, W(90) = 65 kg (inflection), W(0) ≈ 1.5 kg
    Wmax: 130,
    k: 0.0495,
    t0: 90,
  },
  targetSlaughterWeight: 110,

  breedOverrides: {
    pietrain: {
      // Leaner breed, lower mature weight, slightly earlier plateau
      growthParams: {
        model: 'sigmoid',
        Wmax: 105,
        k: 0.052,
        t0: 80,
      },
      targetSlaughterWeight: 95,
    },
    landrace: {
      // Larger prolific breed
      growthParams: {
        model: 'sigmoid',
        Wmax: 145,
        k: 0.047,
        t0: 95,
      },
      targetSlaughterWeight: 120,
    },
    duroc: {
      // Fast-growing with high muscle yield
      growthParams: {
        model: 'sigmoid',
        Wmax: 135,
        k: 0.050,
        t0: 88,
      },
      targetSlaughterWeight: 115,
    },
    large_white: {
      growthParams: {
        model: 'sigmoid',
        Wmax: 140,
        k: 0.048,
        t0: 92,
      },
      targetSlaughterWeight: 118,
    },
  },

  // Feed
  typicalFCR: 2.8,        // kg of feed per kg of live weight gain
  avgDailyGainKg: 0.75,   // typical ADG in finishing phase

  // Carcass
  dressingPercentagePct: 74, // 72–76% range; 74% is a solid industry middle

  // KPI
  productivityKPILabel: 'PSY',
  productivityKPIDescription: 'Porcelets Sevrés par Truie par An',
};
