import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function Settings() {
  const [settings, setSettings] = useState({})
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings')
      setSettings(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setSettings(prev => ({ ...prev, [name]: type === 'checkbox' ? e.target.checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.put('/settings', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Business Info</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input name="business_name" value={settings.business_name || ''} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name (for messages)</label>
              <input name="brand_name" value={settings.brand_name || ''} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
              <input name="tagline" value={settings.tagline || ''} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statement Email</label>
              <input name="statement_email" type="email" value={settings.statement_email || ''} onChange={handleChange} className="input" />
              <p className="text-xs text-gray-500">Email for monthly statements</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Email (Gmail SMTP)</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gmail Address</label>
              <input name="gmail_user" type="email" value={settings.gmail_user || ''} onChange={handleChange} className="input" />
              <p className="text-xs text-gray-500">Used for sending birthday and monthly messages</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gmail App Password</label>
              <input name="gmail_app_password" type="password" value="" onChange={handleChange} className="input" placeholder="Enter to update" />
              <p className="text-xs text-gray-500">Generate at <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-blue-600 hover:underline">myaccount.google.com/apppasswords</a></p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Automation Schedule</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select name="timezone" value={settings.timezone || 'Africa/Lagos'} onChange={handleChange} className="input">
                  <option value="Africa/Lagos">Africa/Lagos (Nigeria)</option>
                  <option value="America/New_York">America/New_York (US)</option>
                  <option value="Europe/London">Europe/London (UK)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (Japan)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statement Day of Month</label>
                <input name="statement_day" type="number" min="1" max="28" value={settings.statement_day || 1} onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statement Time</label>
                <input name="statement_time" type="time" value={settings.statement_time || '21:00'} onChange={handleChange} className="input" />
                <p className="text-xs text-gray-500 mt-1">Last day of month at this time</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Current Configuration</h2>
          </div>
          <div className="p-4">
            <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto"><code>{JSON.stringify({
              business_name: settings.business_name,
              brand_name: settings.brand_name,
              timezone: settings.timezone,
              statement_time: settings.statement_time,
              gmail_user: settings.gmail_user ? '✓ configured' : 'not configured'
            }, null, 2)}</code></pre>
          </div>
        </div>

        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded animate-fade-in">
            Settings saved successfully!
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button type="submit" className="btn btn-primary">Save Settings</button>
        </div>
      </form>
    </div>
  )
}