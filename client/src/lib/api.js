const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

let token = localStorage.getItem('bizstrives_token')

export function getToken() {
  return token
}

export function setToken(newToken) {
  token = newToken
  if (newToken) {
    localStorage.setItem('bizstrives_token', newToken)
  } else {
    localStorage.removeItem('bizstrives_token')
  }
}

export function clearToken() {
  token = null
  localStorage.removeItem('bizstrives_token')
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  setToken,
  clearToken,
  getToken
}