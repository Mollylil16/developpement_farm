import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Finance from './pages/Finance'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Projects from './pages/Projects'
import Communication from './pages/Communication'
import Validation from './pages/Validation'
import Performances from './pages/data/Performances'
import Sante from './pages/data/Sante'
import Reproduction from './pages/data/Reproduction'
import Nutrition from './pages/data/Nutrition'
import Vaccination from './pages/data/Vaccination'
import Tracabilite from './pages/data/Tracabilite'
import Economie from './pages/data/Economie'
import Cartographie from './pages/data/Cartographie'
import Certifications from './pages/data/Certifications'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './contexts/AuthContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="finance" element={<Finance />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:userId" element={<UserDetail />} />
        <Route path="projects" element={<Projects />} />
        <Route path="communication" element={<Communication />} />
        <Route path="validation" element={<Validation />} />
        <Route path="data/performances" element={<Performances />} />
        <Route path="data/sante" element={<Sante />} />
        <Route path="data/reproduction" element={<Reproduction />} />
        <Route path="data/nutrition" element={<Nutrition />} />
        <Route path="data/vaccination" element={<Vaccination />} />
        <Route path="data/tracabilite" element={<Tracabilite />} />
        <Route path="data/economie" element={<Economie />} />
        <Route path="data/cartographie" element={<Cartographie />} />
        <Route path="data/certifications" element={<Certifications />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App

