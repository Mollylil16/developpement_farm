import { Download, FileText, Filter, X } from 'lucide-react'
import { useState } from 'react'
import Button from '../button/Button'
import Badge from '../badge/Badge'

interface TableActionsProps {
  onExportCSV?: () => void
  onExportPDF?: () => void
  onFilter?: () => void
  filterCount?: number
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
}

export default function TableActions({
  onExportCSV,
  onExportPDF,
  onFilter,
  filterCount = 0,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Rechercher...',
}: TableActionsProps) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      {/* Recherche */}
      {onSearchChange && (
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full sm:w-80 pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition-all"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchValue && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {onFilter && (
          <Button
            size="sm"
            variant="outline"
            startIcon={<Filter className="h-4 w-4" />}
            onClick={() => {
              setShowFilters(!showFilters)
              onFilter()
            }}
          >
            Filtres
            {filterCount > 0 && (
              <Badge variant="solid" color="primary" size="sm" className="ml-2">
                {filterCount}
              </Badge>
            )}
          </Button>
        )}

        {onExportCSV && (
          <Button
            size="sm"
            variant="outline"
            startIcon={<Download className="h-4 w-4" />}
            onClick={onExportCSV}
          >
            CSV
          </Button>
        )}

        {onExportPDF && (
          <Button
            size="sm"
            variant="outline"
            startIcon={<FileText className="h-4 w-4" />}
            onClick={onExportPDF}
          >
            PDF
          </Button>
        )}
      </div>
    </div>
  )
}
