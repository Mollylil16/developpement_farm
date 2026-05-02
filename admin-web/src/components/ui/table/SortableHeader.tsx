import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { SortDirection } from '../../../utils/sortUtils'

interface SortableHeaderProps {
  label: string
  sortKey: string
  currentSort: { key: string; direction: SortDirection } | null
  onSort: (key: string) => void
  className?: string
}

export default function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const isActive = currentSort?.key === sortKey
  const direction = isActive ? currentSort.direction : null

  const handleClick = () => {
    onSort(sortKey)
  }

  return (
    <th
      className={`text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <span className="text-gray-400">
          {direction === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : direction === 'desc' ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-50" />
          )}
        </span>
      </div>
    </th>
  )
}
