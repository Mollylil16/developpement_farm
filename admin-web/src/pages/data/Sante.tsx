import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertCircle, Filter } from 'lucide-react'
import { adminApi } from '../../services/api'

export default function Sante() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')

  const { data, isLoading, error } = useQuery({
    queryKey: ['agricole-sante', period],
    queryFn: () => adminApi.getSanteData(period),
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
            Santé Animale
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Incidents sanitaires, maladies (SDRP, circovirus, salmonelles), surveillance épidémiologique
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Activity className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Taux de mortalité
          </h3>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {data?.mortalityRate?.toFixed(2) || '0.00'}%
          </p>
        </div>

        {/* Consommation d'antibiotiques */}
        {data?.antibioticsUsage && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Traitements antibiotiques
            </h3>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {data.antibioticsUsage.total?.treatments || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {data.antibioticsUsage.total?.projects || 0} projets concernés
            </p>
          </div>
        )}
      </div>

      {/* Consommation d'antibiotiques détaillée */}
      {data?.antibioticsUsage?.details && data.antibioticsUsage.details.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Consommation d'antibiotiques
            </h2>
            <div className="space-y-3">
              {data.antibioticsUsage.details.map((antibiotic: any, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {antibiotic.nom_medicament}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {antibiotic.usage_count} utilisations • {antibiotic.affected_projects} projets
                      </p>
                      {antibiotic.total_cost && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Coût total: {parseFloat(antibiotic.total_cost).toLocaleString('fr-FR')} XOF
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Liste des incidents */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Incidents sanitaires récents
          </h2>
          {data?.incidents?.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              Aucun incident sanitaire enregistré
            </p>
          ) : (
            <div className="space-y-4">
              {(data?.incidents || []).map((incident: any) => (
                <div
                  key={incident.id}
                  className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{incident.type}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{incident.description}</p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(incident.date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
