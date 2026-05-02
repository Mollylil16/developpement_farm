import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScanLine, AlertCircle, MapPin, Package, TrendingUp } from 'lucide-react'
import { adminApi } from '../../services/api'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_PRIMARY_COLOR, CHART_HEIGHT_MEDIUM, axisStyle, axisTickStyle, gridStyle, tooltipStyle, PIE_COLORS } from '../../utils/chartStyles'
import TableActions from '../../components/ui/table/TableActions'
import Pagination from '../../components/ui/table/Pagination'
import SortableHeader from '../../components/ui/table/SortableHeader'
import { sortData, SortConfig, toggleSortDirection } from '../../utils/sortUtils'
import { exportToCSV, formatDataForExport } from '../../utils/exportUtils'

export default function Tracabilite() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const { data, isLoading, error } = useQuery({
    queryKey: ['agricole-tracabilite'],
    queryFn: () => adminApi.getTracabiliteData(),
  })

  // Filtrer et trier les données d'abattage
  const filteredAndSortedSlaughter = useMemo(() => {
    let result = data?.slaughterData || []

    if (searchTerm) {
      result = result.filter((slaughter: any) =>
        Object.values(slaughter).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    if (sortConfig) {
      result = sortData(result, sortConfig)
    }

    return result
  }, [data?.slaughterData, searchTerm, sortConfig])

  const paginatedSlaughter = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredAndSortedSlaughter.slice(start, end)
  }, [filteredAndSortedSlaughter, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedSlaughter.length / itemsPerPage)

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
    const exportData = formatDataForExport(filteredAndSortedSlaughter, {
      slaughter_date: 'Date',
      projet_nom: 'Ferme',
      quantity: 'Quantité',
      weight_kg: 'Poids (kg)',
      prix_kg_vif: 'Prix/kg',
      price: 'Montant total',
    })
    exportToCSV(exportData, `tracabilite_${new Date().toISOString().split('T')[0]}.csv`)
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
  const originsChart = data?.origins?.map((origin: any) => ({
    name: origin.origin_type === 'naissance' ? 'Naissance' : origin.origin_type === 'achat' ? 'Achat' : 'Inconnu',
    value: parseInt(origin.count || 0),
  }))

  const slaughterByMonth = data?.slaughterData?.reduce((acc: any, slaughter: any) => {
    const date = new Date(slaughter.slaughter_date)
    const month = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    if (!acc[month]) {
      acc[month] = { quantity: 0, weight: 0 }
    }
    acc[month].quantity += parseFloat(slaughter.quantity || 0)
    acc[month].weight += parseFloat(slaughter.weight_kg || 0)
    return acc
  }, {})

  const slaughterChart = Object.entries(slaughterByMonth || {})
    .map(([name, value]: [string, any]) => ({
      name,
      quantity: value.quantity,
      weight: value.weight,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Traçabilité
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mouvements entre sites, origines génétiques, sécurité sanitaire
          </p>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ScanLine className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Animaux tracés
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.movements?.length || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Origines différentes
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.origins?.length || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Package className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Abattages enregistrés
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.slaughterData?.length || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Poids total abattu
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.totalSlaughtered
              ? (data.totalSlaughtered / 1000).toFixed(1)
              : '0.0'}
            T
          </p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Origines des animaux */}
        {originsChart && originsChart.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Origines des animaux
            </h2>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT_MEDIUM}>
              <PieChart>
                <Pie
                  data={originsChart}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill={CHART_PRIMARY_COLOR}
                  dataKey="value"
                >
                  {originsChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Abattages par mois */}
        {slaughterChart.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Abattages par mois
            </h2>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT_MEDIUM}>
              <BarChart data={slaughterChart}>
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
                <Bar dataKey="weight" fill={CHART_PRIMARY_COLOR} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Données d'abattage */}
      {data?.slaughterData && data.slaughterData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-theme-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Données d'abattage récentes
            </h2>

            <TableActions
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Rechercher une ferme, date..."
              onExportCSV={handleExportCSV}
            />

            {filteredAndSortedSlaughter.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                {searchTerm ? 'Aucun résultat trouvé' : 'Aucune donnée disponible'}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full" id="tracabilite-table">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <SortableHeader
                          label="Date"
                          sortKey="slaughter_date"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Ferme"
                          sortKey="projet_nom"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Quantité"
                          sortKey="quantity"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Poids (kg)"
                          sortKey="weight_kg"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Prix/kg"
                          sortKey="prix_kg_vif"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Montant total"
                          sortKey="price"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSlaughter.map((slaughter: any, index: number) => (
                        <tr
                          key={slaughter.id || index}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                        >
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {new Date(slaughter.slaughter_date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {slaughter.projet_nom || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {slaughter.quantity || 0}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {parseFloat(slaughter.weight_kg || 0).toLocaleString('fr-FR', {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {slaughter.prix_kg_vif
                              ? parseFloat(slaughter.prix_kg_vif).toLocaleString('fr-FR')
                              : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium">
                            {slaughter.price
                              ? parseFloat(slaughter.price).toLocaleString('fr-FR')
                              : 'N/A'}{' '}
                            XOF
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
                    totalItems={filteredAndSortedSlaughter.length}
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
