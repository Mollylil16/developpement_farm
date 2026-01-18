import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, AlertCircle } from 'lucide-react'

export default function Economie() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['agricole-economie'],
    queryFn: () => adminApi.getEconomieData(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mb-4 w-fit">
            <TrendingUp className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Coûts de production
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.productionCosts?.toLocaleString('fr-FR') || '0'} XOF
          </p>
        </div>
      </div>
    </div>
  )
}
