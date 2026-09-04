import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { path: '/dashboard', label: '📊 Dashboard' },
  { path: '/customers', label: '👥 Customers' },
  { path: '/payments', label: '💰 Payments' },
  { path: '/expenses', label: '💸 Expenses' },
  { path: '/savings', label: '🏦 Savings' },
  { path: '/reports', label: '📄 Reports' },
  { path: '/messages', label: '✉️ Messages' },
  { path: '/settings', label: '⚙️ Settings' },
]

export default function Layout() {
  const { logout, user } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col text-brand-text">
      <nav className="bg-brand-surface border-b border-brand-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="text-xl font-bold">
              Biz<span className="text-brand-pink">Strives</span>
            </Link>
            <div className="flex items-center space-x-4">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-brand-pink text-white'
                      : 'text-brand-muted hover:text-brand-text hover:bg-brand-surface2'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <span className="text-sm text-brand-muted mr-4">Welcome, {user?.username}</span>
              <button onClick={logout} className="text-brand-muted hover:text-brand-pink px-3 py-2 rounded-md text-sm font-medium">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>

      <footer className="bg-brand-surface border-t border-brand-border py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-brand-muted text-sm">
          © {new Date().getFullYear()} Biz<span className="text-brand-pink">Strives</span>
        </div>
      </footer>
    </div>
  )
}