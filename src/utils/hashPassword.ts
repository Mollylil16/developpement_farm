/**
 * Utilitaire pour le hachage de mots de passe
 * Utilise une implémentation SHA256 simple en JavaScript
 */

/**
 * Hash un mot de passe en SHA256
 * Note: Cette implémentation est basique. Pour la production, utilisez expo-crypto ou crypto-js
 */
export async function hashPassword(password: string): Promise<string> {
  // Essayer d'utiliser expo-crypto si disponible
  try {
    const Crypto = await import('expo-crypto');
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
  } catch (error) {
    // Fallback: utiliser crypto-js si disponible
    try {
      const CryptoJS = await import('crypto-js');
      return CryptoJS.SHA256(password).toString();
    } catch (error2) {
      // Fallback final: implémentation simple (non sécurisée pour la production)
      // ⚠️ Cette implémentation est uniquement pour le développement
      // En production, vous DEVEZ installer expo-crypto ou crypto-js
      console.warn('⚠️ Aucune bibliothèque de hachage disponible. Utilisation d\'un fallback non sécurisé.');
      return simpleHash(password);
    }
  }
}

/**
 * Hash simple (non sécurisé) - uniquement pour le développement
 * ⚠️ NE PAS UTILISER EN PRODUCTION
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

