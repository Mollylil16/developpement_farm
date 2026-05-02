/**
 * Service de calcul des prix pour le Marketplace
 * Gère les calculs de prix, marges, et suggestions
 */

/**
 * Calculer le prix total basé sur le prix/kg et le poids
 */
export function calculateTotalPrice(pricePerKg: number, weight: number): number {
  return Math.round(pricePerKg * weight);
}

/**
 * Calculer le prix par kg basé sur le prix total et le poids
 */
export function calculatePricePerKg(totalPrice: number, weight: number): number {
  if (weight === 0) return 0;
  return Math.round((totalPrice / weight) * 100) / 100;
}

/**
 * Suggérer un prix de vente basé sur les données du marché
 */
export function suggestMarketPrice(
  currentMarketPrice: number = 2300,
  weight: number,
  adjustmentFactor: number = 1.0
): {
  suggested: number;
  min: number;
  max: number;
  pricePerKg: number;
} {
  // Prix de base (prix marché actuel)
  const basePrice = currentMarketPrice;

  // Ajustement selon le poids (porcs plus lourds peuvent avoir un prix/kg légèrement inférieur)
  let adjustedPricePerKg = basePrice;
  if (weight > 100) {
    adjustedPricePerKg = basePrice * 0.98; // -2% pour gros porcs
  } else if (weight < 50) {
    adjustedPricePerKg = basePrice * 1.05; // +5% pour petits porcs
  }

  // Appliquer le facteur d'ajustement personnalisé
  adjustedPricePerKg *= adjustmentFactor;

  // Calculer le prix total suggéré
  const suggestedTotal = calculateTotalPrice(adjustedPricePerKg, weight);

  // Calculer les limites (±10%)
  const minPrice = Math.round(suggestedTotal * 0.9);
  const maxPrice = Math.round(suggestedTotal * 1.1);

  return {
    suggested: suggestedTotal,
    min: minPrice,
    max: maxPrice,
    pricePerKg: Math.round(adjustedPricePerKg),
  };
}

/**
 * Calculer le profit/perte estimé pour le producteur
 */
export function calculateProfitMargin(
  sellingPrice: number,
  productionCost: number
): {
  profit: number;
  marginPercent: number;
  isProfit: boolean;
} {
  const profit = sellingPrice - productionCost;
  const marginPercent = productionCost > 0 ? (profit / productionCost) * 100 : 0;

  return {
    profit: Math.round(profit),
    marginPercent: Math.round(marginPercent * 10) / 10,
    isProfit: profit >= 0,
  };
}

/**
 * Valider si un prix est dans une fourchette acceptable
 */
export function validatePrice(
  proposedPrice: number,
  referencePrice: number,
  tolerance: number = 0.3
): {
  isValid: boolean;
  reason?: string;
  deviation: number;
} {
  const minAcceptable = referencePrice * (1 - tolerance);
  const maxAcceptable = referencePrice * (1 + tolerance);

  const deviation = ((proposedPrice - referencePrice) / referencePrice) * 100;

  if (proposedPrice < minAcceptable) {
    return {
      isValid: false,
      reason: `Prix trop bas (${Math.abs(Math.round(deviation))}% en dessous du prix de référence)`,
      deviation: Math.round(deviation * 10) / 10,
    };
  }

  if (proposedPrice > maxAcceptable) {
    return {
      isValid: false,
      reason: `Prix trop élevé (${Math.round(deviation)}% au dessus du prix de référence)`,
      deviation: Math.round(deviation * 10) / 10,
    };
  }

  return {
    isValid: true,
    deviation: Math.round(deviation * 10) / 10,
  };
}

/**
 * Formater un prix pour l'affichage
 */
export function formatPrice(price: number | undefined | null, currency: string = 'FCFA'): string {
  if (price === undefined || price === null || isNaN(price)) {
    return `0 ${currency}`;
  }
  return `${price.toLocaleString('fr-FR')} ${currency}`;
}

/**
 * Calculer une remise en pourcentage
 */
export function calculateDiscount(originalPrice: number, discountedPrice: number): number {
  if (originalPrice === 0) return 0;
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
}

/**
 * Appliquer une remise à un prix
 */
export function applyDiscount(price: number, discountPercent: number): number {
  return Math.round(price * (1 - discountPercent / 100));
}

/**
 * Calculer les frais de transaction (si applicable)
 */
export function calculateTransactionFee(
  amount: number,
  feePercent: number = 0
): {
  fee: number;
  netAmount: number;
  grossAmount: number;
} {
  const fee = Math.round(amount * (feePercent / 100));

  return {
    fee,
    netAmount: amount - fee,
    grossAmount: amount,
  };
}

/**
 * Comparer deux prix et retourner la différence
 */
export function comparePrices(
  price1: number,
  price2: number
): {
  difference: number;
  percentDifference: number;
  isHigher: boolean;
} {
  const difference = price1 - price2;
  const percentDifference = price2 > 0 ? (difference / price2) * 100 : 0;

  return {
    difference: Math.round(difference),
    percentDifference: Math.round(percentDifference * 10) / 10,
    isHigher: difference > 0,
  };
}

/**
 * Calculer le prix moyen d'un groupe de listings
 */
export function calculateAveragePrice(prices: number[]): {
  average: number;
  min: number;
  max: number;
  median: number;
} {
  if (prices.length === 0) {
    return { average: 0, min: 0, max: 0, median: 0 };
  }

  const sum = prices.reduce((acc, price) => acc + price, 0);
  const average = sum / prices.length;

  const sortedPrices = [...prices].sort((a, b) => a - b);
  const min = sortedPrices[0];
  const max = sortedPrices[sortedPrices.length - 1];

  const middleIndex = Math.floor(sortedPrices.length / 2);
  const median =
    sortedPrices.length % 2 === 0
      ? (sortedPrices[middleIndex - 1] + sortedPrices[middleIndex]) / 2
      : sortedPrices[middleIndex];

  return {
    average: Math.round(average),
    min: Math.round(min),
    max: Math.round(max),
    median: Math.round(median),
  };
}
