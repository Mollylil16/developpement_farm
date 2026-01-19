/**
 * Utilitaires pour le tri de données
 */

export type SortDirection = 'asc' | 'desc' | null

export interface SortConfig {
  key: string
  direction: SortDirection
}

/**
 * Trie un tableau de données selon une configuration
 */
export function sortData<T>(data: T[], sortConfig: SortConfig | null): T[] {
  if (!sortConfig || !sortConfig.direction) {
    return data
  }

  const sorted = [...data].sort((a, b) => {
    const aValue = getNestedValue(a, sortConfig.key)
    const bValue = getNestedValue(b, sortConfig.key)

    // Gérer les valeurs nulles/undefined
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    // Comparer selon le type
    let comparison = 0
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue, 'fr', { sensitivity: 'base' })
    } else if (aValue instanceof Date && bValue instanceof Date) {
      comparison = aValue.getTime() - bValue.getTime()
    } else {
      comparison = String(aValue).localeCompare(String(bValue), 'fr', { sensitivity: 'base' })
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison
  })

  return sorted
}

/**
 * Obtient une valeur imbriquée depuis un objet (ex: "user.name")
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj)
}

/**
 * Change la direction de tri
 */
export function toggleSortDirection(currentDirection: SortDirection): SortDirection {
  if (currentDirection === null) return 'asc'
  if (currentDirection === 'asc') return 'desc'
  return null
}
