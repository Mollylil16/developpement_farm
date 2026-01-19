import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../services/api'
import { 
  ArrowLeft, 
  AlertCircle, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard, 
  FolderOpen,
  Power,
  DollarSign,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const ROLE_LABELS: Record<string, string> = {
  producer: 'Producteur',
  buyer: 'Acheteur',
  veterinarian: 'Vétérinaire',
  technician: 'Technicien',
}

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-detail', userId],
    queryFn: () => adminApi.getUserDetail(userId!),
    enabled: !!userId,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ isActive }: { isActive: boolean }) =>
      adminApi.updateUserStatus(userId!, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-detail', userId] })
      queryClient.invalidateQueries({ queryKey: ['users-subscriptions'] })
      toast.success('Statut utilisateur mis à jour')
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour')
    },
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <p className="text-sm font-medium text-red-600 mb-1">Erreur de chargement</p>
        <p className="text-xs text-gray-500">Veuillez réessayer</p>
      </div>
    )
  }

  const { user, subscriptions, transactions, projects } = data

  return (
    <div className="space-y-6">
      {/* Header avec bouton retour */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/users')}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            {user.prenom} {user.nom}
          </h1>
          <p className="text-sm text-gray-500">Détails de l'utilisateur</p>
        </div>
      </div>

      {/* Informations utilisateur */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-theme-sm">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Informations</h2>
          <button
            onClick={() => updateStatusMutation.mutate({ isActive: !user.is_active })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              user.is_active
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
            }`}
          >
            <Power className="h-4 w-4" />
            {user.is_active ? 'Désactiver' : 'Activer'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Nom complet</p>
              <p className="text-sm font-medium text-gray-900">
                {user.prenom} {user.nom}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{user.email || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Téléphone</p>
              <p className="text-sm font-medium text-gray-900">{user.telephone || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Rôle actif</p>
              <p className="text-sm font-medium text-gray-900">
                {user.active_role ? ROLE_LABELS[user.active_role] || user.active_role : 'Aucun'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Date d'inscription</p>
              <p className="text-sm font-medium text-gray-900">
                {user.date_creation
                  ? new Date(user.date_creation).toLocaleDateString('fr-FR')
                  : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Dernière connexion</p>
              <p className="text-sm font-medium text-gray-900">
                {user.derniere_connexion
                  ? new Date(user.derniere_connexion).toLocaleDateString('fr-FR')
                  : 'Jamais'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user.is_active ? (
              <CheckCircle className="h-5 w-5 text-brand-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <p className="text-xs text-gray-500">Statut</p>
              <p className={`text-sm font-medium ${user.is_active ? 'text-brand-700' : 'text-red-700'}`}>
                {user.is_active ? 'Actif' : 'Inactif'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user.is_onboarded ? (
              <CheckCircle className="h-5 w-5 text-brand-600" />
            ) : (
              <XCircle className="h-5 w-5 text-orange-600" />
            )}
            <div>
              <p className="text-xs text-gray-500">Onboarded</p>
              <p className={`text-sm font-medium ${user.is_onboarded ? 'text-brand-700' : 'text-orange-700'}`}>
                {user.is_onboarded ? 'Oui' : 'Non'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Abonnements */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-theme-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Abonnements ({subscriptions.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Début</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Aucun abonnement
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {sub.display_name || sub.plan_name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                          sub.status === 'active'
                            ? 'bg-brand-50 text-brand-700 border-brand-200'
                            : sub.status === 'expired'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {sub.started_at ? new Date(sub.started_at).toLocaleDateString('fr-FR') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString('fr-FR') : 'Illimité'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(parseFloat(sub.price_monthly || 0))}/mois
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-theme-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Transactions ({transactions.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Aucune transaction
                  </td>
                </tr>
              ) : (
                transactions.map((transaction: any) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.plan_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(parseFloat(transaction.amount || 0))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {transaction.payment_method || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                          transaction.status === 'completed'
                            ? 'bg-teal-50 text-brand-700 border-teal-200'
                            : transaction.status === 'pending'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Projets */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-theme-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Projets ({projects.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Animaux</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Aucun projet
                  </td>
                </tr>
              ) : (
                projects.map((project: any) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {project.nom || 'Sans nom'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {project.total_animals || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                          project.statut === 'actif'
                            ? 'bg-teal-50 text-brand-700 border-teal-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {project.statut || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {project.date_creation
                        ? new Date(project.date_creation).toLocaleDateString('fr-FR')
                        : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

