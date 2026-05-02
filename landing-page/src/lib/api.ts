import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const publicApi = {
  // Récupérer les statistiques publiques
  async getStats() {
    const response = await apiClient.get('/api/public/stats')
    return response.data
  },

  // Récupérer les meilleurs producteurs
  async getTopProducers(limit: number = 6) {
    const response = await apiClient.get(`/api/public/producers/top?limit=${limit}`)
    return response.data
  },

  // Récupérer les témoignages
  async getTestimonials() {
    const response = await apiClient.get('/api/public/testimonials')
    return response.data
  },
}
