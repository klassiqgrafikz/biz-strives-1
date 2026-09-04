import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(username, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex items-center justify-center">
      <div className="max-w-md mx-auto">
        <div className="bg-brand-surface rounded-lg border border-brand-border shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Create Admin <span className="text-brand-pink">Account</span></h1>
        <p className="text-brand-muted text-center mb-6">First-time setup</p>
        {error && <div className="bg-pink-600 bg-opacity-20 border border-brand-pink text-pink-400 px-4 py-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-muted mb-1">Password (min 6 chars)</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="input"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full btn btn-primary disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        </div>
      </div>
    </div>
  )
}