import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Award, AlertCircle, TrendingUp, Building2 } from 'lucide-react'
import { adminApi } from '../../services/api'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { CHART_PRIMARY_COLOR, CHART_SECONDARY_COLOR, CHART_HEIGHT_MEDIUM, axisStyle, axisTickStyle, gridStyle, tooltipStyle, PIE_COLORS } from '../../utils/chartStyles'
import TableActions from '../../components/ui/table/TableActions'
import Pagination from '../../components/ui/table/Pagination'
import SortableHeader from '../../components/ui/table/SortableHeader'
import { sortData, SortConfig, toggleSortDirection } from '../../utils/sortUtils'
import { exportToCSV, formatDataForExport } from '../../utils/exportUtils'

export default function Certifications() {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const { data, isLoading, error } = useQuery({
    queryKey: ['agricole-certifications'],
    queryFn: () => adminApi.getCertificationsData(),
  })

  // Filtrer et trier les données
  const filteredAndSortedData = useMemo(() => {
    let result = data?.certifications || []

    // Filtre de recherche
    if (searchTerm) {
      result = result.filter((cert: any) =>
        Object.values(cert).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Tri
    if (sortConfig) {
      result = sortData(result, sortConfig)
    }

    return result
  }, [data?.certifications, searchTerm, sortConfig])

  // Pagination
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredAndSortedData.slice(start, end)
  }, [filteredAndSortedData, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage)

  // Handlers
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
    const exportData = formatDataForExport(filteredAndSortedData, {
      projet_nom: 'Ferme',
      localisation: 'Localisation',
      certification_type: 'Type de certification',
      vaccination_count: 'Vaccinations',
      disease_count: 'Maladies',
    })
    exportToCSV(exportData, `certifications_${new Date().toISOString().split('T')[0]}.csv`)
  }

  const handleExportPDF = () => {
    // Pour PDF, on utilise l'ID du tableau
    exportToCSV(filteredAndSortedData, `certifications_${new Date().toISOString().split('T')[0]}.csv`)
    // Note: exportToPDF nécessiterait un ID d'élément, on utilise CSV pour l'instant
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
  const certificationDistribution = data?.certifications?.reduce((acc: any, cert: any) => {
    const type = cert.certification_type || 'Conventionnel'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {}) || {}

  const chartData = Object.entries(certificationDistribution).map(([name, value]) => ({
    name,
    value,
  }))

  const pieData = chartData.map((item, index) => ({
    ...item,
    color: PIE_COLORS[index % PIE_COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Certifications
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Adoption de labels et certifications (bio, bien-être animal, sans antibiotiques), évolution du marché
          </p>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Fermes certifiées
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.totalCertifiedFarms || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Sur {data?.certifications?.length || 0} fermes totales
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-success-100 dark:bg-success-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-success-600 dark:text-success-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Taux de certification
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.certifications?.length > 0
              ? ((data.totalCertifiedFarms / data.certifications.length) * 100).toFixed(1)
              : '0.0'}
            %
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
              <Building2 className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Labels disponibles
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.labels?.length || 0}
          </p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par type */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Répartition par type de certification
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT_MEDIUM}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill={CHART_PRIMARY_COLOR}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500 text-sm">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Graphique en barres */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Nombre de fermes par certification
          </h2>
          {chartData.length > 0 ? (
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
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500 text-sm">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>

      {/* Liste des certifications */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-theme-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Détails des certifications
          </h2>

          {/* Actions de table */}
          <TableActions
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Rechercher une ferme, localisation, type..."
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
          />

          {filteredAndSortedData.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              {searchTerm ? 'Aucun résultat trouvé' : 'Aucune certification enregistrée'}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full" id="certifications-table">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <SortableHeader
                        label="Ferme"
                        sortKey="projet_nom"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Localisation"
                        sortKey="localisation"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Type"
                        sortKey="certification_type"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Vaccinations"
                        sortKey="vaccination_count"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Maladies"
                        sortKey="disease_count"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((cert: any, index: number) => (
                      <tr
                        key={cert.projet_id || index}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                      >
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {cert.projet_nom || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {cert.localisation || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                              cert.certification_type === 'Bio'
                                ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500'
                                : cert.certification_type === 'Conventionnel amélioré'
                                ? 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-500'
                                : 'bg-gray-50 text-gray-700 dark:bg-gray-500/15 dark:text-gray-500'
                            }`}
                          >
                            {cert.certification_type || 'Conventionnel'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {cert.vaccination_count || 0}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {cert.disease_count || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredAndSortedData.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Labels disponibles */}
      {data?.labels && data.labels.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Labels disponibles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.labels.map((label: any, index: number) => (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">{label.name}</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Code: {label.code}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{label.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
