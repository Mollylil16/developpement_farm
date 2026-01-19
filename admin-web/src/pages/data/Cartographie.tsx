import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../services/api'
import { MapPin, AlertCircle } from 'lucide-react'

export default function Cartographie() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['agricole-cartographie'],
    queryFn: () => adminApi.getCartographieData(),
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
            Cartographie
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Effectifs par type de production, naissage, engraissement, post-sevrage, cartographie de la filière nationale
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg mb-4 w-fit">
          <MapPin className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Carte interactive à venir...
        </p>
      </div>
    </div>
  )
}
