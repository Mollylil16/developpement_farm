import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../services/api'
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Menu,
  X,
  Search,
  ChevronDown,
  Plus,
  MessageSquare,
  Bell,
  UserPlus,
  FileText,
  Settings,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

import { Mail } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Finance', href: '/finance', icon: DollarSign },
  { name: 'Utilisateurs', href: '/users', icon: Users },
  { name: 'Projets', href: '/projects', icon: FolderOpen },
  { name: 'Communication', href: '/communication', icon: Mail },
]

export default function Layout() {
  const { admin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)

  // Recherche globale
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['global-search', searchQuery],
    queryFn: () => adminApi.globalSearch(searchQuery),
    enabled: searchQuery.length >= 2,
  })

  // Notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => adminApi.getNotifications(10),
    refetchInterval: 30000, // Refetch toutes les 30 secondes
  })

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowQuickActions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Raccourci clavier pour la recherche (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder="Q Search"]') as HTMLInputElement
        searchInput?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setShowSearchResults(query.length >= 2)
  }

  const handleSearchResultClick = (url: string) => {
    navigate(url)
    setSearchQuery('')
    setShowSearchResults(false)
  }

  const allSearchResults = [
    ...(searchResults?.users || []).map((u: any) => ({ ...u, icon: Users })),
    ...(searchResults?.projects || []).map((p: any) => ({ ...p, icon: FolderOpen })),
    ...(searchResults?.transactions || []).map((t: any) => ({ ...t, icon: DollarSign })),
  ]

  const unreadCount = notificationsData?.unread_count || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar style HiveQ */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 h-20 px-6 border-b border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center">
              <span className="text-white text-lg font-bold">FP</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">FarmtrackPro</h1>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden ml-auto text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Bar - Fonctionnelle */}
          <div className="px-4 py-4 border-b border-gray-100 relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Q Search"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded">⌘ K</kbd>
              </div>
            </div>

            {/* Résultats de recherche */}
            {showSearchResults && searchQuery.length >= 2 && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {searchLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500">Recherche...</div>
                ) : allSearchResults.length > 0 ? (
                  <div className="py-2">
                    {allSearchResults.map((result: any) => (
                      <button
                        key={result.id}
                        onClick={() => handleSearchResultClick(result.url)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <result.icon className="h-4 w-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">Aucun résultat</div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Workspace selector (bottom) */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">FP</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">FarmtrackPro Workspace</div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 bg-white rounded-lg text-gray-600 hover:text-gray-900 border border-gray-200 shadow-sm"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content avec header */}
      <div className="lg:pl-72">
        {/* Header style HiveQ */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between h-16 px-6">
            <h1 className="text-xl font-semibold text-gray-900">
              {location.pathname === '/dashboard' ? 'Dashboard' :
               location.pathname === '/finance' ? 'Finance' :
               location.pathname === '/users' ? 'Utilisateurs' :
               location.pathname.startsWith('/users/') ? 'Détails utilisateur' :
               location.pathname === '/projects' ? 'Projets' : 'Dashboard'}
            </h1>
            <div className="flex items-center gap-3">
              {/* User avatars */}
              <div className="flex items-center -space-x-2">
                <div className="w-8 h-8 rounded-full bg-teal-500 border-2 border-white flex items-center justify-center text-white text-xs font-semibold">
                  {admin?.prenom?.[0]}
                </div>
              </div>
              
              {/* Bouton + (Actions rapides) */}
              <div className="relative" ref={actionsRef}>
                <button
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
                {showQuickActions && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          navigate('/users')
                          setShowQuickActions(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <UserPlus className="h-4 w-4 text-gray-400" />
                        <span>Nouvel utilisateur</span>
                      </button>
                      <button
                        onClick={() => {
                          navigate('/finance')
                          setShowQuickActions(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span>Nouvelle transaction</span>
                      </button>
                      <button
                        onClick={() => {
                          navigate('/projects')
                          setShowQuickActions(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <FolderOpen className="h-4 w-4 text-gray-400" />
                        <span>Nouveau projet</span>
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => {
                          // TODO: Ouvrir modal paramètres
                          setShowQuickActions(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <Settings className="h-4 w-4 text-gray-400" />
                        <span>Paramètres</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bouton Chat */}
              <button
                onClick={() => navigate('/users')}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors relative"
                title="Messages"
              >
                <MessageSquare className="h-4 w-4" />
              </button>

              {/* Bouton Notifications - Dynamique */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors relative"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <p className="text-xs text-gray-500 mt-1">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
                      )}
                    </div>
                    <div className="py-2">
                      {notificationsData?.notifications?.length > 0 ? (
                        notificationsData.notifications.map((notif: any, index: number) => (
                          <div
                            key={index}
                            className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
                            onClick={() => {
                              if (notif.type === 'transaction') navigate('/finance')
                              else if (notif.type === 'user') navigate('/users')
                              else if (notif.type === 'subscription') navigate('/users')
                              setShowNotifications(false)
                            }}
                          >
                            <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notif.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-sm text-gray-500">
                          Aucune notification
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
