import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, AlertCircle, Building2, Droplets, Zap, Wind, Shield } from 'lucide-react'
import { adminApi } from '../../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { CHART_PRIMARY_COLOR, CHART_SECONDARY_COLOR, CHART_HEIGHT_MEDIUM, axisStyle, axisTickStyle, gridStyle, tooltipStyle } from '../../utils/chartStyles'
import TableActions from '../../components/ui/table/TableActions'
import Pagination from '../../components/ui/table/Pagination'
import SortableHeader from '../../components/ui/table/SortableHeader'
import { sortData, SortConfig, toggleSortDirection } from '../../utils/sortUtils'
import { exportToCSV, formatDataForExport } from '../../utils/exportUtils'

export default function Cartographie() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const { data, isLoading, error } = useQuery({
    queryKey: ['agricole-cartographie'],
    queryFn: () => adminApi.getCartographieData(),
  })

  // Filtrer et trier les fermes
  const filteredAndSortedFarms = useMemo(() => {
    let result = data?.farms || []

    if (searchTerm) {
      result = result.filter((farm: any) =>
        Object.values(farm).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    if (sortConfig) {
      result = sortData(result, sortConfig)
    }

    return result
  }, [data?.farms, searchTerm, sortConfig])

  const paginatedFarms = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredAndSortedFarms.slice(start, end)
  }, [filteredAndSortedFarms, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedFarms.length / itemsPerPage)

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
    const exportData = formatDataForExport(filteredAndSortedFarms, {
      localisation: 'Localisation',
      farm_count: 'Nombre de fermes',
      animal_count: 'Nombre d\'animaux',
      truie_count: 'Truies',
      porcelet_count: 'Porcelets',
      engraissement_count: 'Engraissement',
    })
    exportToCSV(exportData, `cartographie_${new Date().toISOString().split('T')[0]}.csv`)
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
  const locationsChart = data?.locations?.slice(0, 10).map((loc: any) => ({
    name: loc.location || 'N/A',
    fermes: parseInt(loc.farmCount || 0),
    animaux: parseInt(loc.animalCount || 0),
  }))

  const emissionsChart = data?.emissions?.slice(0, 10).map((emission: any) => ({
    name: emission.projet_nom || 'N/A',
    nh3: parseFloat(emission.estimated_ammonia_kg_per_year || 0) / 1000, // en tonnes
    co2: parseFloat(emission.estimated_co2_kg_per_year || 0) / 1000, // en tonnes
  }))

  const biosecurityChart = data?.biosecurity?.slice(0, 10).map((bio: any) => ({
    name: bio.projet_nom || 'N/A',
    vaccinations: parseInt(bio.vaccination_count || 0),
    epidemies: parseInt(bio.disease_outbreak_count || 0),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Cartographie
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Effectifs par type de production, naissage, engraissement, post-sevrage, cartographie de la filière nationale
          </p>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <MapPin className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Localisations
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.locations?.length || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Droplets className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Consommation eau
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.waterConsumption?.length || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fermes suivies</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Consommation énergie
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.energyConsumption?.length || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fermes suivies</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Biosécurité
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.biosecurity?.length || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fermes évaluées</p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Effectifs par localisation */}
        {locationsChart && locationsChart.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Effectifs par localisation
            </h2>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT_MEDIUM}>
              <BarChart data={locationsChart}>
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
                <Legend />
                <Bar dataKey="fermes" fill={CHART_PRIMARY_COLOR} radius={[5, 5, 0, 0]} name="Fermes" />
                <Bar dataKey="animaux" fill={CHART_SECONDARY_COLOR} radius={[5, 5, 0, 0]} name="Animaux" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Émissions */}
        {emissionsChart && emissionsChart.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Émissions estimées (tonnes/an)
            </h2>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT_MEDIUM}>
              <BarChart data={emissionsChart}>
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
                <Legend />
                <Bar dataKey="nh3" fill={CHART_PRIMARY_COLOR} radius={[5, 5, 0, 0]} name="NH3 (t/an)" />
                <Bar dataKey="co2" fill={CHART_SECONDARY_COLOR} radius={[5, 5, 0, 0]} name="CO2 (t/an)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Consommation d'eau et énergie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consommation d'eau */}
        {data?.waterConsumption && data.waterConsumption.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-theme-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Consommation d'eau
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Ferme
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Coût total
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Coût moyen/mois
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.waterConsumption.slice(0, 10).map((water: any, index: number) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                      >
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {water.projet_nom || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {parseFloat(water.total_cost || 0).toLocaleString('fr-FR')} XOF
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {parseFloat(water.avg_monthly_cost || 0).toLocaleString('fr-FR')} XOF
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Consommation d'énergie */}
        {data?.energyConsumption && data.energyConsumption.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-theme-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Consommation d'énergie
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Ferme
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Coût total
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Coût moyen/mois
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.energyConsumption.slice(0, 10).map((energy: any, index: number) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                      >
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {energy.projet_nom || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {parseFloat(energy.total_cost || 0).toLocaleString('fr-FR')} XOF
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {parseFloat(energy.avg_monthly_cost || 0).toLocaleString('fr-FR')} XOF
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

      {/* Biosécurité */}
      {biosecurityChart && biosecurityChart.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Pratiques de biosécurité
          </h2>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT_MEDIUM}>
            <BarChart data={biosecurityChart}>
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
              <Legend />
              <Bar dataKey="vaccinations" fill={CHART_PRIMARY_COLOR} radius={[5, 5, 0, 0]} name="Vaccinations" />
              <Bar dataKey="epidemies" fill={CHART_SECONDARY_COLOR} radius={[5, 5, 0, 0]} name="Épidémies" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tableau des fermes par localisation */}
      {data?.farms && data.farms.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-theme-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Effectifs par type de production
            </h2>

            <TableActions
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Rechercher une localisation..."
              onExportCSV={handleExportCSV}
            />

            {filteredAndSortedFarms.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                {searchTerm ? 'Aucun résultat trouvé' : 'Aucune donnée disponible'}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full" id="cartographie-table">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <SortableHeader
                          label="Localisation"
                          sortKey="localisation"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Fermes"
                          sortKey="farm_count"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Animaux"
                          sortKey="animal_count"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Truies"
                          sortKey="truie_count"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Porcelets"
                          sortKey="porcelet_count"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                        <SortableHeader
                          label="Engraissement"
                          sortKey="engraissement_count"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedFarms.map((farm: any, index: number) => (
                        <tr
                          key={index}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                        >
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {farm.localisation || 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {farm.farm_count || 0}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {farm.animal_count || 0}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {farm.truie_count || 0}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {farm.porcelet_count || 0}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {farm.engraissement_count || 0}
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
                    totalItems={filteredAndSortedFarms.length}
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
