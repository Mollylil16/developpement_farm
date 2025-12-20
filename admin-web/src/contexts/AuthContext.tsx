import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../services/api'

interface Admin {
  id: string
  email: string
  nom: string
  prenom: string
}

interface AuthContextType {
  admin: Admin | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Vérifier si un token existe dans localStorage
    const token = localStorage.getItem('admin_token')
    console.log('🔍 Vérification du token au chargement:', token ? 'Token présent' : 'Aucun token')
    if (token) {
      // Vérifier le profil pour valider le token
      console.log('📡 Vérification du profil...')
      adminApi.getProfile()
        .then((data) => {
          console.log('✅ Profil vérifié:', data)
          setAdmin(data)
        })
        .catch((error) => {
          console.error('❌ Erreur lors de la vérification du profil:', error)
          console.error('Détails:', error.response?.data || error.message)
          localStorage.removeItem('admin_token')
          setAdmin(null)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Début de la connexion...')
      const response = await adminApi.login(email, password)
      console.log('✅ Connexion réussie, réponse:', response)
      localStorage.setItem('admin_token', response.access_token)
      console.log('💾 Token stocké dans localStorage')
      setAdmin(response.admin)
      console.log('👤 Admin défini:', response.admin)
      console.log('🚀 Redirection vers /dashboard')
      navigate('/dashboard')
    } catch (error: any) {
      console.error('❌ Erreur de connexion:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Erreur de connexion'
      if (error.response?.status === 0 || error.code === 'ERR_NETWORK') {
        throw new Error('Impossible de se connecter au serveur. Vérifiez que le backend est lancé.')
      }
      throw new Error(errorMessage)
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    setAdmin(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

