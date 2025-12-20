import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../services/api'
import { DollarSign, TrendingUp, CreditCard, AlertCircle } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Finance() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month')
  const [transactionPage, setTransactionPage] = useState(1)

  const { data: financeStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['finance-stats', period],
    queryFn: () => adminApi.getFinanceStats(period),
  })

  const { data: transactions, isLoading: transactionsLoading, error: transactionsError } = useQuery({
    queryKey: ['transactions', transactionPage],
    queryFn: () => adminApi.getTransactions({ page: transactionPage, limit: 20 }),
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value)
  }

  if (statsLoading || transactionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (statsError || transactionsError) {
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

  const totalRevenue = financeStats?.revenue_by_period?.reduce(
    (sum: number, item: any) => sum + parseFloat(item.revenue || 0),
    0
  ) || 0

  const totalTransactions = financeStats?.revenue_by_period?.reduce(
    (sum: number, item: any) => sum + parseInt(item.transaction_count || 0),
    0
  ) || 0

  const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

  // Metric cards style HiveQ
  const metricCards = [
    {
      name: 'Revenus Totaux',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
    },
    {
      name: 'Transactions',
      value: totalTransactions,
      icon: TrendingUp,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      name: 'Moyenne par Transaction',
      value: formatCurrency(avgTransaction),
      icon: CreditCard,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-end">
        <div className="flex gap-2 bg-gray-50 rounded-lg p-1 border border-gray-100">
          {(['day', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              {p === 'day' ? 'Jour' : p === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards style HiveQ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metricCards.map((card) => (
          <div
            key={card.name}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-soft hover:shadow-card transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.iconBg}`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{card.value}</p>
              <p className="text-sm text-gray-500">{card.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      {financeStats?.revenue_by_period && financeStats.revenue_by_period.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-soft">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Évolution des Revenus</h3>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{period === 'day' ? 'Aujourd\'hui' : period === 'week' ? 'Cette semaine' : 'Ce mois'}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={financeStats.revenue_by_period}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#64748b' }}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                  }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#64748b' }}
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
          </div>

          {/* Payment Method Chart */}
          {financeStats?.revenue_by_payment_method && financeStats.revenue_by_payment_method.length > 0 && (
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-soft">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenus par Méthode</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={financeStats.revenue_by_payment_method}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="total_revenue"
                  >
                    {financeStats.revenue_by_payment_method.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#14b8a6', '#a855f7', '#f97316', '#3b82f6', '#ef4444'][index % 5]} />
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
                    formatter={(value: any) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Revenue by Plan */}
      {financeStats?.revenue_by_plan && financeStats.revenue_by_plan.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-soft">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Revenus par Plan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={financeStats.revenue_by_plan}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="display_name" 
                stroke="#94a3b8" 
                style={{ fontSize: '12px' }}
                tick={{ fill: '#64748b' }}
              />
              <YAxis 
                stroke="#94a3b8" 
                style={{ fontSize: '12px' }}
                tick={{ fill: '#64748b' }}
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
              <Bar dataKey="total_revenue" fill="#14b8a6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transactions Table style HiveQ */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-soft overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Transactions Récentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Méthode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {transactions?.data?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Aucune transaction trouvée
                  </td>
                </tr>
              ) : (
                transactions?.data?.map((transaction: any) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.user_email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.plan_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(parseFloat(transaction.amount || 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.payment_method || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          transaction.status === 'completed'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : transaction.status === 'pending'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {transaction.status === 'completed' ? 'Complété' : 
                         transaction.status === 'pending' ? 'En attente' : 
                         transaction.status === 'failed' ? 'Échoué' : transaction.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {transactions?.pagination && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <p className="text-sm text-gray-500">
              Page {transactions.pagination.page} sur {transactions.pagination.total_pages} ({transactions.pagination.total} transactions)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setTransactionPage((p) => Math.max(1, p - 1))}
                disabled={transactionPage === 1}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Précédent
              </button>
              <button
                onClick={() => setTransactionPage((p) => p + 1)}
                disabled={transactionPage >= transactions.pagination.total_pages}
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
