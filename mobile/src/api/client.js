import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../utils/constants'

const TOKEN_KEY = 'bizstrives_token'
let token = null

export async function loadToken() {
  token = await AsyncStorage.getItem(TOKEN_KEY)
  return token
}

export function getToken() {
  return token
}

export async function setToken(newToken) {
  token = newToken
  if (newToken) {
    await AsyncStorage.setItem(TOKEN_KEY, newToken)
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY)
  }
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    await setToken(null)
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }

  if (res.status === 204) return null

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/pdf')) {
    return res.blob()
  }

  return res.json()
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: (path, body) =>
    request(path, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
