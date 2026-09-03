import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me')
      setUser(res.data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    api.setToken(res.data.token)
    setUser(res.data.user)
    return res.data
  }

  const register = async (username, password) => {
    const res = await api.post('/auth/register', { username, password })
    api.setToken(res.data.token)
    setUser(res.data.user)
    return res.data
  }

  const logout = () => {
    api.clearToken()
    setUser(null)
  }

  const value = { user, loading, login, register, logout, refetch: fetchUser }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}