import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UtensilsCrossed, AlertCircle, Package, TrendingUp, Droplets } from 'lucide-react'
import { adminApi } from '../../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_PRIMARY_COLOR, CHART_HEIGHT_MEDIUM, axisStyle, axisTickStyle, gridStyle, tooltipStyle } from '../../utils/chartStyles'
import TableActions from '../../components/ui/table/TableActions'
import Pagination from '../../components/ui/table/Pagination'
import SortableHeader from '../../components/ui/table/SortableHeader'
import { sortData, SortConfig, toggleSortDirection } from '../../utils/sortUtils'
import { exportToCSV, formatDataForExport } from '../../utils/exportUtils'

export default function Nutrition() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const { data, isLoading, error } = useQuery({
    queryKey: ['agricole-nutrition'],
    queryFn: () => adminApi.getNutritionData(),
  })

  // Filtrer et trier les données d'origines
  const filteredAndSortedOrigins = useMemo(() => {
    let result = data?.origins || []

    if (searchTerm) {
      result = result.filter((origin: any) =>
        Object.values(origin).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    if (sortConfig) {
      result = sortData(result, sortConfig)
    }

    return result
  }, [data?.origins, searchTerm, sortConfig])

  const paginatedOrigins = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredAndSortedOrigins.slice(start, end)
  }, [filteredAndSortedOrigins, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedOrigins.length / itemsPerPage)

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
    const exportData = formatDataForExport(filteredAndSortedOrigins, {
      ingredient_name: 'Ingrédient',
      provenance: 'Provenance',
      fournisseur: 'Fournisseur',
      total_quantity_kg: 'Quantité (kg)',
      usage_count: 'Utilisations',
    })
    exportToCSV(exportData, `nutrition_${new Date().toISOString().split('T')[0]}.csv`)
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
  const originsChart = data?.origins?.slice(0, 10).map((origin: any) => ({
    name: origin.ingredient_name || 'N/A',
    quantity: parseFloat(origin.total_quantity_kg || 0),
  }))

  const additivesChart = data?.additives?.slice(0, 10).map((additive: any) => ({
    name: additive.additive_name || 'N/A',
    quantity: parseFloat(additive.total_quantity_kg || 0),
    projects: parseInt(additive.projects_using || 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Nutrition
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Composition et provenance des aliments, types de formules, origine des matières premières, traçabilité
          </p>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <UtensilsCrossed className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Rations enregistrées
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.feedComposition?.length || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Ingrédients uniques
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.origins?.length || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Additifs utilisés
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.additives?.length || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Droplets className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Déjections/jour
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.wasteManagement?.totalDailyWaste
              ? (data.wasteManagement.totalDailyWaste / 1000).toFixed(1)
              : '0.0'}
            T
          </p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 ingrédients par quantité */}
        {originsChart && originsChart.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Top 10 ingrédients par quantité (kg)
            </h2>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT_MEDIUM}>
              <BarChart data={originsChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} />
                <XAxis
                  dataKey="name"
                  stroke={axisTickStyle.fill}
                  style={axisStyle}
                  tick={axisTickStyle}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke={axisTickStyle.fill}
                  style={axisStyle}
                  tick={axisTickStyle}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="quantity" fill={CHART_PRIMARY_COLOR} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top 10 additifs */}
        {additivesChart && additivesChart.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Top 10 additifs alimentaires
            </h2>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT_MEDIUM}>
              <BarChart data={additivesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStyle.stroke} />
                <XAxis
                  dataKey="name"
                  stroke={axisTickStyle.fill}
                  style={axisStyle}
                  tick={axisTickStyle}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke={axisTickStyle.fill}
                  style={axisStyle}
                  tick={axisTickStyle}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="quantity" fill={CHART_PRIMARY_COLOR} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Provenance des ingrédients */}
      {data?.origins && data.origins.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-theme-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Provenance des ingrédients
            </h2>

            <TableActions
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Rechercher un ingrédient, provenance, fournisseur..."
              onExportCSV={handleExportCSV}
            />

            {filteredAndSortedOrigins.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                {searchTerm ? 'Aucun résultat trouvé' : 'Aucune donnée disponible'}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full" id="nutrition-table">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <SortableHeader
                          label="Ingrédient"
                          sortKey="ingredient_name"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Provenance"
                          sortKey="provenance"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Fournisseur"
                          sortKey="fournisseur"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Quantité (kg)"
                          sortKey="total_quantity_kg"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Utilisations"
                          sortKey="usage_count"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrigins.map((origin: any, index: number) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                        >
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {origin.ingredient_name || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {origin.provenance || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {origin.fournisseur || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {parseFloat(origin.total_quantity_kg || 0).toLocaleString('fr-FR', {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {origin.usage_count || 0}
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
                    totalItems={filteredAndSortedOrigins.length}
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

      {/* Gestion des déjections */}
      {data?.wasteManagement?.farms && data.wasteManagement.farms.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-theme-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Gestion des déjections par ferme
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Ferme
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Nombre d'animaux
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Déjections estimées (kg/jour)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.wasteManagement.farms.slice(0, 20).map((farm: any, index: number) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                    >
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        {farm.projet_nom || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        {farm.animal_count || 0}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                        {parseFloat(farm.estimated_daily_waste_kg || 0).toLocaleString('fr-FR', {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
