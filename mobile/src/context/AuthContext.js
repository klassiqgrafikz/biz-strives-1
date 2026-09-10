import React, { createContext, useContext, useState, useEffect } from 'react'
import { api, setToken, loadToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    bootstrap()
  }, [])

  async function bootstrap() {
    try {
      const savedToken = await loadToken()
      if (savedToken) {
        const res = await api.get('/api/auth/me')
        setUser(res.user)
      }
    } catch {
      await setToken(null)
    } finally {
      setLoading(false)
    }
  }

  async function login(username, password) {
    const res = await api.post('/api/auth/login', { username, password })
    await setToken(res.token)
    setUser(res.user)
    return res
  }

  async function register(username, password) {
    const res = await api.post('/api/auth/register', { username, password })
    await setToken(res.token)
    setUser(res.user)
    return res
  }

  async function logout() {
    await setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
