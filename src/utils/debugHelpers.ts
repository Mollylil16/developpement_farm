/**
 * Utilitaires de débogage pour identifier les boucles infinies et erreurs
 */

let renderCount = new Map<string, number>();
let lastRenderTime = new Map<string, number>();

/**
 * Détecte les re-renders excessifs (boucles infinies potentielles)
 */
export function detectInfiniteLoop(componentName: string, threshold = 50) {
  const now = Date.now();
  const lastTime = lastRenderTime.get(componentName) || 0;

  // Réinitialiser le compteur si plus d'1 seconde s'est écoulée
  if (now - lastTime > 1000) {
    renderCount.set(componentName, 0);
  }

  const count = (renderCount.get(componentName) || 0) + 1;
  renderCount.set(componentName, count);
  lastRenderTime.set(componentName, now);

  if (count > threshold) {
    console.error(
      `🔴 BOUCLE INFINIE DÉTECTÉE: ${componentName} a rendu ${count} fois en 1 seconde!`
    );
    return true;
  }

  if (count > 10) {
    console.warn(`⚠️ Re-renders excessifs: ${componentName} (${count} fois)`);
  }

  return false;
}

/**
 * Log les changements de props pour identifier ce qui cause les re-renders
 */
export function logPropsChanges(componentName: string, props: any, prevProps: any) {
  const changes: string[] = [];

  Object.keys(props).forEach((key) => {
    if (props[key] !== prevProps[key]) {
      changes.push(`${key}: ${JSON.stringify(prevProps[key])} → ${JSON.stringify(props[key])}`);
    }
  });

  if (changes.length > 0) {
    console.log(`📝 ${componentName} props changed:`, changes);
  }
}

/**
 * Wrapper pour useEffect qui log les déclenchements
 */
export function debugUseEffect(componentName: string, effectName: string, deps: any[]) {
  console.log(`🔄 ${componentName}.${effectName} triggered with:`, deps);
}
