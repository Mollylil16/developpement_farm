import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import Button from '../button/Button'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  itemsPerPageOptions?: number[]
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      {/* Informations */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Affichage de <span className="font-medium text-gray-900 dark:text-white">{startItem}</span> à{' '}
        <span className="font-medium text-gray-900 dark:text-white">{endItem}</span> sur{' '}
        <span className="font-medium text-gray-900 dark:text-white">{totalItems}</span> résultats
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        {/* Première page */}
        <Button
          size="sm"
          variant="outline"
          startIcon={<ChevronsLeft className="h-4 w-4" />}
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          Début
        </Button>

        {/* Page précédente */}
        <Button
          size="sm"
          variant="outline"
          startIcon={<ChevronLeft className="h-4 w-4" />}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        />

        {/* Numéros de page */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                  ...
                </span>
              )
            }
            return (
              <Button
                key={page}
                size="sm"
                variant={currentPage === page ? 'solid' : 'outline'}
                onClick={() => onPageChange(page as number)}
                className="min-w-[40px]"
              >
                {page}
              </Button>
            )
          })}
        </div>

        {/* Page suivante */}
        <Button
          size="sm"
          variant="outline"
          endIcon={<ChevronRight className="h-4 w-4" />}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        />

        {/* Dernière page */}
        <Button
          size="sm"
          variant="outline"
          endIcon={<ChevronsRight className="h-4 w-4" />}
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          Fin
        </Button>
      </div>

      {/* Items par page */}
      {onItemsPerPageChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Par page:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
