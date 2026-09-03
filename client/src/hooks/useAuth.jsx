import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, onAuthChange } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    if (!api.getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const res = await api.get('/auth/me')
      setUser(res.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
    const unsubscribe = onAuthChange(() => {
      if (!api.getToken()) {
        setUser(null)
      } else {
        setLoading(true)
        fetchUser()
      }
    })
    return unsubscribe
  }, [fetchUser])

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    api.setToken(res.token)
    setUser(res.user)
    return res
  }

  const register = async (username, password) => {
    const res = await api.post('/auth/register', { username, password })
    api.setToken(res.token)
    setUser(res.user)
    return res
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