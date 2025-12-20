import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  Users,
  FolderOpen,
  DollarSign,
  TrendingUp,
  UserPlus,
  AlertCircle,
  Activity,
  ArrowRight,
} from 'lucide-react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const ROLE_COLORS: Record<string, string> = {
  producer: '#10b981',
  buyer: '#3b82f6',
  veterinarian: '#8b5cf6',
  technician: '#f59e0b',
}

const ROLE_LABELS: Record<string, string> = {
  producer: 'Producteur',
  buyer: 'Acheteur',
  veterinarian: 'Vétérinaire',
  technician: 'Technicien',
}

export default function Dashboard() {
  const { admin } = useAuth()
  const navigate = useNavigate()
  const [periodFilter, setPeriodFilter] = useState('7j')

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats', periodFilter],
    queryFn: () => adminApi.getDashboardStats(periodFilter === 'Tout' ? undefined : periodFilter),
    refetchInterval: 30000, // Refetch toutes les 30 secondes
  })

  const { data: revenueTrend } = useQuery({
    queryKey: ['revenue-trend', 6],
    queryFn: () => adminApi.getRevenueTrend(6),
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
      <div className="flex flex-col items-center justify-center h-96">
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <p className="text-sm font-medium text-red-600 mb-1">Erreur de chargement</p>
        <p className="text-xs text-gray-500">Veuillez réessayer</p>
      </div>
    )
  }

  const finance = stats?.finance || {}
  const users = stats?.users || {}
  const projects = stats?.projects || {}
  const subscriptions = stats?.subscriptions || {}
  const roles = stats?.roles || { distribution: [], detailed: [] }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Welcome banner avec nom réel de l'admin
  const adminName = admin?.prenom || 'Admin'

  // Metric cards style HiveQ - avec navigation fonctionnelle
  const metricCards = [
    {
      name: 'Utilisateurs Actifs',
      value: users.active_users || 0,
      icon: Users,
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      onClick: () => navigate('/users'),
    },
    {
      name: 'Abonnements',
      value: subscriptions.active_subscriptions || 0,
      icon: Activity,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      onClick: () => navigate('/users?filter=subscription'),
    },
    {
      name: 'Revenus du Mois',
      value: formatCurrency(finance.current_month_revenue || 0),
      icon: DollarSign,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      onClick: () => navigate('/finance'),
    },
  ]

  // Revenue data from API - format pour le graphique
  const revenueData = revenueTrend?.map((item: any) => ({
    date: new Date(item.month).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
    revenue: parseFloat(item.revenue || 0),
  })) || []

  const rolesPieData = roles.distribution?.map((r: any) => ({
    name: ROLE_LABELS[r.active_role] || r.active_role,
    value: parseInt(r.count || 0),
    color: ROLE_COLORS[r.active_role] || '#64748b',
  })) || []

  return (
    <div className="space-y-6">
      {/* Welcome Banner style HiveQ */}
      <div className="bg-gradient-to-r from-teal-50 to-teal-100 rounded-xl p-6 border border-teal-200">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">
          Bienvenue, {adminName} 👋
        </h2>
        <p className="text-gray-600">
          Le succès de votre équipe commence ici. Faisons des progrès ensemble !
        </p>
      </div>

      {/* Metric Cards style HiveQ - avec navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metricCards.map((card) => (
          <div
            key={card.name}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-soft hover:shadow-card transition-all cursor-pointer"
            onClick={card.onClick}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.iconBg}`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-2">
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.name}</p>
            </div>
            <button 
              className="text-sm font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1 mt-4"
              onClick={(e) => {
                e.stopPropagation()
                card.onClick()
              }}
            >
              Voir les détails
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart style HiveQ - avec données réelles */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Évolution des Revenus</h3>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>6 derniers mois</span>
            </div>
          </div>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#64748b' }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#64748b' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#14b8a6"
                  strokeWidth={3}
                  dot={{ fill: '#14b8a6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-280 flex items-center justify-center text-gray-500 text-sm">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Role Distribution style HiveQ */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Répartition par Rôle</h3>
          </div>
          {rolesPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={rolesPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {rolesPieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-280 flex items-center justify-center text-gray-500 text-sm">
              Aucune donnée disponible
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users - avec filtres fonctionnels */}
        {roles.detailed && roles.detailed.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Utilisateurs par Rôle</h3>
              <div className="flex gap-2">
                {['7j', '1m', '1a', 'Tout'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setPeriodFilter(period)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      periodFilter === period
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {roles.detailed.slice(0, 6).map((role: any) => (
                <div 
                  key={role.active_role} 
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/users?role=${role.active_role}`)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: ROLE_COLORS[role.active_role] || '#64748b' }}
                    >
                      {ROLE_LABELS[role.active_role]?.[0] || role.active_role[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {ROLE_LABELS[role.active_role] || role.active_role}
                      </p>
                      <p className="text-xs text-gray-500">{role.active_count || 0} actifs</p>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats Card */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200 rounded-full -mr-16 -mt-16 opacity-20"></div>
          <div className="relative">
            <h3 className="text-sm font-semibold text-orange-900 uppercase tracking-wider mb-2">
              Statistiques Rapides
            </h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">Vue d'ensemble</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Projets actifs</span>
                <span className="font-semibold text-gray-900">{projects.active_projects || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Total utilisateurs</span>
                <span className="font-semibold text-gray-900">{users.total_users || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">MRR</span>
                <span className="font-semibold text-gray-900">{formatCurrency(finance.mrr || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Nouveaux (30j)</span>
                <span className="font-semibold text-gray-900">{users.new_users_30d || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
