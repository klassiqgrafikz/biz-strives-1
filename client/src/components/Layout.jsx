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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="text-xl font-bold text-blue-600">BizStrives</Link>
            <div className="flex items-center space-x-4">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <span className="text-sm text-gray-500 mr-4">Welcome, {user?.username}</span>
              <button onClick={logout} className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} BizStrives
        </div>
      </footer>
    </div>
  )
}