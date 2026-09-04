import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/customers', label: 'Customers', icon: '👥' },
  { path: '/payments', label: 'Payments', icon: '💰' },
  { path: '/expenses', label: 'Expenses', icon: '💸' },
  { path: '/savings', label: 'Savings', icon: '🏦' },
  { path: '/reports', label: 'Reports', icon: '📄' },
  { path: '/messages', label: 'Messages', icon: '✉️' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col">
      {/* Top bar */}
      <header className="bg-brand-surface border-b border-brand-border sticky top-0 z-40 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-brand-muted hover:text-brand-text p-1 rounded transition-colors"
            aria-label="Toggle menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/dashboard" className="text-lg font-bold">
            Biz<span className="text-brand-pink">Strives</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-brand-muted hidden sm:inline">{user?.username}</span>
          <button onClick={logout} className="text-brand-muted hover:text-brand-pink text-sm font-medium transition-colors">
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-60 bg-brand-surface border-r border-brand-border flex flex-col transition-transform duration-200 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
        >
          <nav className="flex-1 py-2 overflow-y-auto">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-brand-pink text-white'
                    : 'text-brand-muted hover:text-brand-text hover:bg-brand-surface2'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-brand-border text-xs text-brand-muted text-center">
            © {new Date().getFullYear()} Biz<span className="text-brand-pink">Strives</span>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-60 px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
