import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

console.log('🔧 Configuration API:', {
  API_BASE_URL,
  VITE_API_URL: import.meta.env.VITE_API_URL,
})

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 secondes de timeout
})

// Intercepteur pour ajouter le token admin
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercepteur pour gérer les erreurs 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const adminApi = {
  login: async (email: string, password: string) => {
    try {
      const url = `${API_BASE_URL}/admin/auth/login`
      console.log('🔗 Tentative de connexion à:', url)
      console.log('📡 API_BASE_URL:', API_BASE_URL)
      const response = await api.post('/admin/auth/login', { email, password })
      console.log('✅ Connexion réussie:', response.status)
      return response.data
    } catch (error: any) {
      console.error('❌ Erreur API login:', error)
      console.error('🌐 URL complète:', `${API_BASE_URL}/admin/auth/login`)
      console.error('📊 Status:', error.response?.status)
      console.error('📦 Data:', error.response?.data)
      console.error('🔌 Code erreur:', error.code)
      console.error('📡 Message:', error.message)
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        console.error('⚠️ Erreur réseau - Le backend n\'est peut-être pas accessible')
      }
      throw error
    }
  },

  getProfile: async () => {
    const response = await api.get('/admin/profile')
    return response.data
  },

  getDashboardStats: async (period?: string) => {
    try {
      const url = period ? `/admin/dashboard/stats?period=${period}` : '/admin/dashboard/stats'
      console.log('📊 Appel API:', url)
      const response = await api.get(url)
      console.log('✅ Réponse dashboard stats:', response.status)
      return response.data
    } catch (error: any) {
      console.error('❌ Erreur getDashboardStats:', error)
      console.error('Status:', error.response?.status)
      console.error('Data:', error.response?.data)
      throw error
    }
  },

  getFinanceStats: async (period: 'day' | 'week' | 'month' = 'month') => {
    const response = await api.get(`/admin/finance/stats?period=${period}`)
    return response.data
  },

  getTransactions: async (params?: {
    page?: number
    limit?: number
    status?: string
    payment_method?: string
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.payment_method) queryParams.append('payment_method', params.payment_method)

    const response = await api.get(`/admin/finance/transactions?${queryParams.toString()}`)
    return response.data
  },

  getUsersWithSubscriptions: async (params?: {
    page?: number
    limit?: number
    has_subscription?: boolean
    subscription_status?: string
    role?: string
    search?: string
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.has_subscription !== undefined) {
      queryParams.append('has_subscription', params.has_subscription.toString())
    }
    if (params?.subscription_status) {
      queryParams.append('subscription_status', params.subscription_status)
    }
    if (params?.role) {
      queryParams.append('role', params.role)
    }
    if (params?.search) {
      queryParams.append('search', params.search)
    }

    const response = await api.get(`/admin/users/subscriptions?${queryParams.toString()}`)
    return response.data
  },

  getRevenueTrend: async (months: number = 6) => {
    const response = await api.get(`/admin/revenue/trend?months=${months}`)
    return response.data
  },

  getProjects: async (params?: {
    page?: number
    limit?: number
    statut?: string
    user_id?: string
    search?: string
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.statut) queryParams.append('statut', params.statut)
    if (params?.user_id) queryParams.append('user_id', params.user_id)
    if (params?.search) queryParams.append('search', params.search)

    const response = await api.get(`/admin/projects?${queryParams.toString()}`)
    return response.data
  },

  getUserDetail: async (userId: string) => {
    const response = await api.get(`/admin/users/${userId}`)
    return response.data
  },

  updateUserStatus: async (userId: string, isActive: boolean) => {
    const response = await api.put(`/admin/users/${userId}/status`, { is_active: isActive })
    return response.data
  },

  updateUserSubscription: async (userId: string, subscriptionId: string, status: string) => {
    const response = await api.put(`/admin/users/${userId}/subscription/${subscriptionId}`, { status })
    return response.data
  },

  getNotifications: async (limit: number = 10) => {
    const response = await api.get(`/admin/notifications?limit=${limit}`)
    return response.data
  },

  globalSearch: async (query: string) => {
    const response = await api.get(`/admin/search?q=${encodeURIComponent(query)}`)
    return response.data
  },

  // ==================== COMMUNICATION ====================

  sendMessage: async (data: any) => {
    const response = await api.post('/admin/messages/send', data)
    return response.data
  },

  getMessages: async (page: number = 1, limit: number = 50) => {
    const response = await api.get(`/admin/messages?page=${page}&limit=${limit}`)
    return response.data
  },

  congratulateActiveUsers: async (data: { message: string; gift_description?: string }) => {
    const response = await api.post('/admin/users/congratulate', data)
    return response.data
  },

  // ==================== PROMOTIONS ====================

  createPromotion: async (data: any) => {
    const response = await api.post('/admin/promotions', data)
    return response.data
  },

  getPromotions: async (page: number = 1, limit: number = 50, filters?: any) => {
    const queryParams = new URLSearchParams()
    queryParams.append('page', page.toString())
    queryParams.append('limit', limit.toString())
    if (filters?.is_active !== undefined) queryParams.append('is_active', filters.is_active.toString())
    if (filters?.type) queryParams.append('type', filters.type)

    const response = await api.get(`/admin/promotions?${queryParams.toString()}`)
    return response.data
  },

  getPromotion: async (id: string) => {
    const response = await api.get(`/admin/promotions/${id}`)
    return response.data
  },

  updatePromotionStatus: async (id: string, isActive: boolean) => {
    const response = await api.put(`/admin/promotions/${id}/status`, { is_active: isActive })
    return response.data
  },
}

export default api

