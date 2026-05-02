import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, TrendingUp, AlertCircle, Filter } from 'lucide-react'
import { adminApi } from '../../services/api'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_PRIMARY_COLOR, CHART_HEIGHT_MEDIUM, axisStyle, axisTickStyle, gridStyle, tooltipStyle, barStyle } from '../../utils/chartStyles'

export default function Performances() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  const { data, isLoading, error } = useQuery({
    queryKey: ['agricole-performances', period],
    queryFn: () => adminApi.getPerformancesData(period),
  })

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Performances Zootechniques
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gain moyen quotidien, indice de conversion alimentaire, efficacité des élevages
          </p>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Gain moyen quotidien
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.averageDailyGain?.toFixed(2) || '0.00'} g/jour
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Indice de conversion alimentaire
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.feedConversionRatio?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Évolution des performances
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="week">Semaine</option>
              <option value="month">Mois</option>
              <option value="year">Année</option>
            </select>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT_MEDIUM}>
            <BarChart data={data?.data || []}>
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
      </div>
    </div>
  )
}
