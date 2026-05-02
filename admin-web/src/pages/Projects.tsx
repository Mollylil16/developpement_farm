import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../services/api'
import { FolderOpen, Search, Filter, AlertCircle, Users, PiggyBank, Calendar } from 'lucide-react'

export default function Projects() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statutFilter, setStatutFilter] = useState<string | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', page, statutFilter, searchTerm],
    queryFn: () =>
      adminApi.getProjects({
        page,
        limit: 20,
        statut: statutFilter,
        search: searchTerm || undefined,
      }),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    const errorMessage = (error as any)?.response?.data?.message || (error as any)?.message || 'Erreur inconnue'
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <p className="text-sm font-medium text-red-600 mb-1">Erreur de chargement</p>
        <p className="text-xs text-gray-500 mb-2">Veuillez réessayer</p>
        <p className="text-xs text-gray-400 max-w-md text-center">{errorMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-sm font-medium"
        >
          Actualiser la page
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Projets</h1>
          <p className="text-sm text-gray-500">Gestion des projets de l'application</p>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-theme-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          {/* Filtre statut */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <div className="flex gap-2 flex-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
              <button
                onClick={() => setStatutFilter(undefined)}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statutFilter === undefined
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setStatutFilter('actif')}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statutFilter === 'actif'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
              >
                Actifs
              </button>
              <button
                onClick={() => setStatutFilter('archive')}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statutFilter === 'archive'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
              >
                Archivés
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table des projets */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-theme-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projet
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Propriétaire
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Animaux
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Date de création
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Aucun projet trouvé
                  </td>
                </tr>
              ) : (
                data?.data?.map((project: any) => (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 text-brand-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{project.nom || 'Sans nom'}</p>
                          {project.description && (
                            <p className="text-xs text-gray-500 truncate max-w-xs">{project.description}</p>
                          )}
                          {/* Propriétaire visible sur mobile */}
                          <p className="text-xs text-gray-500 truncate md:hidden mt-1">
                            {project.user_prenom} {project.user_nom}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            {project.user_prenom} {project.user_nom}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{project.user_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <PiggyBank className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-900">{project.total_animals || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                          project.statut === 'actif'
                            ? 'bg-brand-50 text-brand-700 border-brand-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {project.statut === 'actif' ? 'Actif' : 'Archivé'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        {project.date_creation
                          ? new Date(project.date_creation).toLocaleDateString('fr-FR')
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/users?user_id=${project.user_id}`)}
                        className="text-xs sm:text-sm font-medium text-brand-600 hover:text-brand-700 whitespace-nowrap"
                      >
                        <span className="hidden sm:inline">Voir utilisateur</span>
                        <span className="sm:hidden">Voir</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data?.pagination && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <p className="text-sm text-gray-500">
              Page {data.pagination.page} sur {data.pagination.total_pages} ({data.pagination.total} projets)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.total_pages}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
