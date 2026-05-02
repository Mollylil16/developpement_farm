import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, AlertCircle, DollarSign, TrendingDown, Percent } from 'lucide-react'
import { adminApi } from '../../services/api'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_PRIMARY_COLOR, CHART_SECONDARY_COLOR, CHART_HEIGHT_MEDIUM, axisStyle, axisTickStyle, gridStyle, tooltipStyle } from '../../utils/chartStyles'

export default function Economie() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['agricole-economie'],
    queryFn: () => adminApi.getEconomieData(),
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Préparer les données pour le graphique
  const comparisonData = [
    {
      name: 'Coûts',
      value: data?.productionCosts || 0,
      type: 'cost',
    },
    {
      name: 'Revenus',
      value: data?.revenues || 0,
      type: 'revenue',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Économie
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Coûts de production, prix de l'aliment, coût vétérinaire, rentabilité, compétitivité du secteur
          </p>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Coûts de production
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {formatCurrency(data?.productionCosts || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-success-100 dark:bg-success-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-success-600 dark:text-success-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Revenus totaux
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {formatCurrency(data?.revenues || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
              <DollarSign className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Bénéfice net
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {formatCurrency((data?.revenues || 0) - (data?.productionCosts || 0))}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <div className="flex items-center justify-between mb-4">
            <div
              className={`p-3 rounded-lg ${
                (data?.profitability || 0) >= 0
                  ? 'bg-success-100 dark:bg-success-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}
            >
              <Percent
                className={`h-6 w-6 ${
                  (data?.profitability || 0) >= 0
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Rentabilité
          </h3>
          <p
            className={`text-2xl font-semibold ${
              (data?.profitability || 0) >= 0
                ? 'text-success-600 dark:text-success-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {data?.profitability?.toFixed(2) || '0.00'}%
          </p>
        </div>
      </div>

      {/* Graphique de comparaison */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Comparaison Coûts vs Revenus
        </h2>
        {comparisonData.length > 0 && (comparisonData[0].value > 0 || comparisonData[1].value > 0) ? (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT_MEDIUM}>
            <BarChart data={comparisonData}>
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
                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                {comparisonData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.type === 'cost' ? CHART_SECONDARY_COLOR : CHART_PRIMARY_COLOR}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-500 text-sm">
            Aucune donnée disponible
          </div>
        )}
      </div>

      {/* Résumé financier */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Analyse financière
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Coûts de production</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(data?.productionCosts || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Revenus totaux</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(data?.revenues || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-brand-50 dark:bg-brand-900/30 rounded-lg border border-brand-200 dark:border-brand-700">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Bénéfice net</span>
              <span
                className={`text-sm font-semibold ${
                  (data?.revenues || 0) - (data?.productionCosts || 0) >= 0
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatCurrency((data?.revenues || 0) - (data?.productionCosts || 0))}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">Marge de rentabilité</span>
              <span
                className={`text-sm font-semibold ${
                  (data?.profitability || 0) >= 0
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {data?.profitability?.toFixed(2) || '0.00'}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-theme-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Indicateurs clés
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ratio revenus/coûts</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {data?.productionCosts > 0
                  ? ((data.revenues / data.productionCosts) * 100).toFixed(1)
                  : '0.0'}
                %
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Coût moyen par unité</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {data?.productionCosts > 0
                  ? formatCurrency(data.productionCosts / 100)
                  : formatCurrency(0)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Revenu moyen par unité</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {data?.revenues > 0 ? formatCurrency(data.revenues / 100) : formatCurrency(0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
