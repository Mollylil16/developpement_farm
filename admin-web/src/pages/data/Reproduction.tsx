import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Baby, AlertCircle } from 'lucide-react'
import { adminApi } from '../../services/api'

export default function Reproduction() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['agricole-reproduction'],
    queryFn: () => adminApi.getReproductionData(),
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Reproduction
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Taux de mise bas, nombre de porcelets sevrés par truie, productivité des cheptels
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg mb-4 w-fit">
            <Baby className="h-6 w-6 text-pink-600 dark:text-pink-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Taux de mise bas
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.birthRate?.toFixed(1) || '0.0'}%
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg mb-4 w-fit">
            <Baby className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Porcelets sevrés/truie
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.pigletsPerSow?.toFixed(1) || '0.0'}
          </p>
        </div>
      </div>
    </div>
  )
}
