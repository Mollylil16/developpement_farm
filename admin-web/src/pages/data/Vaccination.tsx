import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Syringe, AlertCircle, Shield, Activity } from 'lucide-react'
import { adminApi } from '../../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_PRIMARY_COLOR, CHART_HEIGHT_MEDIUM, axisStyle, axisTickStyle, gridStyle, tooltipStyle } from '../../utils/chartStyles'
import TableActions from '../../components/ui/table/TableActions'
import Pagination from '../../components/ui/table/Pagination'
import SortableHeader from '../../components/ui/table/SortableHeader'
import { sortData, SortConfig, toggleSortDirection } from '../../utils/sortUtils'
import { exportToCSV, formatDataForExport } from '../../utils/exportUtils'

export default function Vaccination() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const { data, isLoading, error } = useQuery({
    queryKey: ['agricole-vaccination'],
    queryFn: () => adminApi.getVaccinationData(),
  })

  // Filtrer et trier les programmes
  const filteredAndSortedPrograms = useMemo(() => {
    let result = data?.programs || []

    if (searchTerm) {
      result = result.filter((program: any) =>
        Object.values(program).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    if (sortConfig) {
      result = sortData(result, sortConfig)
    }

    return result
  }, [data?.programs, searchTerm, sortConfig])

  const paginatedPrograms = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredAndSortedPrograms.slice(start, end)
  }, [filteredAndSortedPrograms, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedPrograms.length / itemsPerPage)

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        const newDirection = toggleSortDirection(prev.direction)
        return newDirection ? { key, direction: newDirection } : null
      }
      return { key, direction: 'asc' }
    })
  }

  const handleExportCSV = () => {
    const exportData = formatDataForExport(filteredAndSortedPrograms, {
      nom_vaccin: 'Vaccin',
      date_vaccination: 'Date',
      vaccinated_count: 'Animaux vaccinés',
    })
    exportToCSV(exportData, `vaccination_${new Date().toISOString().split('T')[0]}.csv`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <p className="text-sm font-medium text-red-600 mb-1">Erreur de chargement</p>
        <p className="text-xs text-gray-500">Veuillez réessayer</p>
      </div>
    )
  }

  // Préparer les données pour les graphiques
  const programsByMonth = data?.programs?.reduce((acc: any, program: any) => {
    const date = new Date(program.date_vaccination)
    const month = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    acc[month] = (acc[month] || 0) + parseInt(program.vaccinated_count || 0)
    return acc
  }, {})

  const chartData = Object.entries(programsByMonth || {})
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Vaccination
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Programmes vaccinaux appliqués, types de vaccins, couverture, prévention sanitaire
          </p>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Syringe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Programmes vaccinaux
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.programs?.length || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-success-100 dark:bg-success-900/30 rounded-lg">
              <Shield className="h-6 w-6 text-success-600 dark:text-success-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Couverture vaccinale
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.coverage?.toFixed(1) || '0.0'}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {data?.vaccinatedAnimals || 0} / {data?.totalAnimals || 0} animaux
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Animaux vaccinés
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.vaccinatedAnimals || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Sur {data?.totalAnimals || 0} animaux actifs
          </p>
        </div>
      </div>

      {/* Graphique d'évolution */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Évolution des vaccinations par mois
          </h2>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT_MEDIUM}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} />
              <XAxis
                dataKey="name"
                stroke={axisTickStyle.fill}
                style={axisStyle}
                tick={axisTickStyle}
                axisLine={false}
              />
              <YAxis
                stroke={axisTickStyle.fill}
                style={axisStyle}
                tick={axisTickStyle}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill={CHART_PRIMARY_COLOR} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Liste des programmes */}
      {data?.programs && data.programs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-theme-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Programmes vaccinaux récents
            </h2>

            <TableActions
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Rechercher un vaccin, date..."
              onExportCSV={handleExportCSV}
            />

            {filteredAndSortedPrograms.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                {searchTerm ? 'Aucun résultat trouvé' : 'Aucune donnée disponible'}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full" id="vaccination-table">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <SortableHeader
                          label="Vaccin"
                          sortKey="nom_vaccin"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Date"
                          sortKey="date_vaccination"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Animaux vaccinés"
                          sortKey="vaccinated_count"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPrograms.map((program: any, index: number) => (
                        <tr
                          key={program.id || index}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                        >
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {program.nom_vaccin || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(program.date_vaccination).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {program.vaccinated_count || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredAndSortedPrograms.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
