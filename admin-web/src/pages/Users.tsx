import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../services/api'
import { UserCheck, UserX, Filter, Search, AlertCircle, Eye, Power } from 'lucide-react'
import { toast } from 'react-hot-toast'

const ROLE_LABELS: Record<string, string> = {
  producer: 'Producteur',
  buyer: 'Acheteur',
  veterinarian: 'Vétérinaire',
  technician: 'Technicien',
}

const ROLE_COLORS: Record<string, string> = {
  producer: 'bg-green-50 text-green-700 border-green-200',
  buyer: 'bg-blue-50 text-blue-700 border-blue-200',
  veterinarian: 'bg-purple-50 text-purple-700 border-purple-200',
  technician: 'bg-amber-50 text-amber-700 border-amber-200',
}

export default function Users() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [hasSubscription, setHasSubscription] = useState<boolean | undefined>(undefined)
  const [selectedRole, setSelectedRole] = useState<string | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['users-subscriptions', page, hasSubscription, selectedRole, searchTerm],
    queryFn: () =>
      adminApi.getUsersWithSubscriptions({
        page,
        limit: 20,
        has_subscription: hasSubscription,
        role: selectedRole,
        search: searchTerm || undefined,
      }),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminApi.updateUserStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-subscriptions'] })
      toast.success('Statut utilisateur mis à jour')
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
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
      {/* Filtres et recherche style HiveQ */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          {/* Filtre abonnement */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <div className="flex gap-2 flex-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
              <button
                onClick={() => setHasSubscription(undefined)}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  hasSubscription === undefined
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setHasSubscription(true)}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  hasSubscription === true
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
              >
                Avec abonnement
              </button>
              <button
                onClick={() => setHasSubscription(false)}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  hasSubscription === false
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                }`}
              >
                Sans abonnement
              </button>
            </div>
          </div>

          {/* Filtre rôle */}
          <div className="lg:col-span-2 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 font-medium">Rôle:</span>
            <div className="flex gap-2 flex-wrap flex-1">
              <button
                onClick={() => setSelectedRole(undefined)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selectedRole === undefined
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:text-gray-900 hover:bg-white border border-gray-200'
                }`}
              >
                Tous
              </button>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedRole(selectedRole === key ? undefined : key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    selectedRole === key
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:text-gray-900 hover:bg-white border border-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Table style HiveQ */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Onboarded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date d'inscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dernière connexion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                data?.data?.map((user: any) => {
                  let roles = []
                  try {
                    roles = user.roles ? JSON.parse(user.roles) : []
                  } catch (e) {
                    roles = []
                  }

                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {user.subscription_id ? (
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                              <UserCheck className="h-4 w-4 text-teal-600" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <UserX className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {user.prenom} {user.nom}
                            </p>
                            {user.telephone && (
                              <p className="text-xs text-gray-500">{user.telephone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.active_role ? (
                          <span
                            className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                              ROLE_COLORS[user.active_role] || 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            {ROLE_LABELS[user.active_role] || user.active_role}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Aucun rôle</span>
                        )}
                        {roles.length > 1 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {roles.length} rôle{roles.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.plan_display_name || (
                          <span className="text-gray-400">Aucun</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                            user.is_active
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                            user.is_onboarded
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          }`}
                        >
                          {user.is_onboarded ? 'Oui' : 'Non'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.date_creation
                          ? new Date(user.date_creation).toLocaleDateString('fr-FR')
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.derniere_connexion
                          ? new Date(user.derniere_connexion).toLocaleDateString('fr-FR')
                          : 'Jamais'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/users/${user.id}`)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => updateStatusMutation.mutate({ userId: user.id, isActive: !user.is_active })}
                            className={`p-2 rounded-lg transition-colors ${
                              user.is_active
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-teal-600 hover:bg-teal-50'
                            }`}
                            title={user.is_active ? 'Désactiver' : 'Activer'}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {data?.pagination && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <p className="text-sm text-gray-500">
              Page {data.pagination.page} sur {data.pagination.total_pages} ({data.pagination.total} utilisateurs)
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
