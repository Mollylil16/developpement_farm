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
    const token = sessionStorage.getItem('admin_token')
    if (token) {
      adminApi.getProfile()
        .then((data) => {
          setAdmin(data)
        })
        .catch(() => {
          sessionStorage.removeItem('admin_token')
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
      const response = await adminApi.login(email, password)
      sessionStorage.setItem('admin_token', response.access_token)
      setAdmin(response.admin)
      navigate('/dashboard')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Erreur de connexion'
      if (error.response?.status === 0 || error.code === 'ERR_NETWORK') {
        throw new Error('Impossible de se connecter au serveur. Vérifiez que le backend est lancé.')
      }
      throw new Error(errorMessage)
    }
  }

  const logout = () => {
    sessionStorage.removeItem('admin_token')
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

