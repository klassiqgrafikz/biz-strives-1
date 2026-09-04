import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function Settings() {
  const [settings, setSettings] = useState({})
  const [gmailAppPassword, setGmailAppPassword] = useState('')
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
      await api.put('/settings', { ...settings, gmail_app_password: gmailAppPassword })
      setGmailAppPassword('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="space-y-6 text-brand-text">
      <h1 className="text-2xl font-bold">Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <div className="p-4 border-b border-brand-border">
            <h2 className="text-lg font-semibold">Business Info</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-1">Business Name</label>
              <input name="business_name" value={settings.business_name || ''} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-1">Brand Name (for messages)</label>
              <input name="brand_name" value={settings.brand_name || ''} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-1">Tagline</label>
              <input name="tagline" value={settings.tagline || ''} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-1">Statement Email</label>
              <input name="statement_email" type="email" value={settings.statement_email || ''} onChange={handleChange} className="input" />
              <p className="text-xs text-brand-muted">Email for monthly statements</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-brand-border">
            <h2 className="text-lg font-semibold">Email (Gmail SMTP)</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-1">Gmail Address</label>
              <input name="gmail_user" type="email" value={settings.gmail_user || ''} onChange={handleChange} className="input" />
              <p className="text-xs text-brand-muted">Used for sending birthday and monthly messages</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-muted mb-1">Gmail App Password</label>
              <input
                name="gmail_app_password"
                type="password"
                value={gmailAppPassword}
                onChange={e => setGmailAppPassword(e.target.value)}
                className="input"
                placeholder="Enter your app password to update"
                autoComplete="new-password"
              />
              <p className="text-xs text-brand-muted">Generate at <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-brand-pink hover:underline">myaccount.google.com/apppasswords</a> — leave blank to keep your current password.</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-brand-border">
            <h2 className="text-lg font-semibold">Automation Schedule</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-muted mb-1">Timezone</label>
                <select name="timezone" value={settings.timezone || 'Africa/Lagos'} onChange={handleChange} className="input">
                  <option value="Africa/Lagos">Africa/Lagos (Nigeria)</option>
                  <option value="America/New_York">America/New_York (US)</option>
                  <option value="Europe/London">Europe/London (UK)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (Japan)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-muted mb-1">Statement Day of Month</label>
                <input name="statement_day" type="number" min="1" max="28" value={settings.statement_day || 1} onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-muted mb-1">Statement Time</label>
                <input name="statement_time" type="time" value={settings.statement_time || '21:00'} onChange={handleChange} className="input" />
                <p className="text-xs text-brand-muted mt-1">Last day of month at this time</p>
              </div>
            </div>
            <div className="bg-brand-pink bg-opacity-20 border border-brand-pink border-opacity-40 rounded-md p-3">
              <p className="text-sm text-pink-400">
                <span className="font-medium">Automated emails:</span> monthly statement (income − expenses) is sent to your Statement Email on the last day of each month, and a savings reminder is sent every Friday if no savings were recorded that week. Set your Gmail details above to enable these.
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-4 border-b border-brand-border">
            <h2 className="text-lg font-semibold">Current Configuration</h2>
          </div>
          <div className="p-4">
            <pre className="text-sm bg-brand-bg border border-brand-border p-3 rounded overflow-auto text-brand-muted"><code>{JSON.stringify({
              business_name: settings.business_name,
              brand_name: settings.brand_name,
              timezone: settings.timezone,
              statement_time: settings.statement_time,
              gmail_user: settings.gmail_user ? '✓ configured' : 'not configured'
            }, null, 2)}</code></pre>
          </div>
        </div>

        {saved && (
          <div className="bg-brand-lime bg-opacity-20 border border-brand-lime text-brand-lime px-4 py-3 rounded animate-fade-in">
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